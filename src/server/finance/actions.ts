/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { FeeEntryType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import {
  assertCanAccessMatter,
  assertCanAssociateMatter,
  isManager,
  matterVisibilityFilter
} from "@/lib/permissions";
import { notifyRoleApprovers } from "@/server/notifications/approval";
import {
  invoiceMatterSearchLimit,
  invoiceMatterSearchWhere
} from "./invoice-matter-search";
import { buildAgingRows, summarizeAging, type AgingBucketKey, type AgingRow, type MatterAgg } from "./aging";
import {
  buildInvoiceRequestData,
  invoiceNotificationContent,
  invoiceRequestViolation,
  invoiceValidationViolation,
  type InvoiceRequestInput
} from "./invoice-request-lib";
import {
  buildClientOptions,
  buildInvoiceContext
} from "./invoice-context-lib";
import {
  buildMonthlyRevenueBuckets,
  computeMatterFinanceStats,
  monthStartOf,
  revenueWindowStart,
  yearStartOf
} from "./finance-stats-lib";
import { fetchMatterFinanceData } from "./queries";

// ============ Thống kê tài chính toàn cục ============

export async function getMatterFinance(matterId: string) {
  const session = await requireSession();
  await assertCanAccessMatter(session.user.id, session.user.role, matterId);

  // 4 query song song (io, đã tách sang queries.ts)
  const { billings, entries, plans, issuedInvoices } = await fetchMatterFinanceData(matterId);
  const stats = computeMatterFinanceStats({ billings, entries, issuedInvoices });

  return { billings, entries, plans, stats };
}

/**
 * v0.11: Liệt kê các yêu cầu xuất hóa đơn của vụ
 */
/** Select danh sách yêu cầu hóa đơn của vụ (trích để action ≤20 dòng). */
const INVOICE_REQUEST_LIST_SELECT = {
  id: true,
  amount: true,
  title: true,
  status: true,
  processNote: true,
  requestedAt: true,
  processedAt: true,
  invoiceType: true,
  invoiceItem: true,
  buyerName: true,
  buyerTaxNo: true,
  evidenceDocIds: true,
  invoiceNo: true,
  issuedAt: true
} as const;

export async function listMatterInvoiceRequests(matterId: string) {
  const session = await requireSession();
  await assertCanAccessMatter(session.user.id, session.user.role, matterId);
  return prisma.invoiceRequest.findMany({
    where: { matterId },
    orderBy: { requestedAt: "desc" },
    select: INVOICE_REQUEST_LIST_SELECT
  });
}

/** Select matter cho context xuất hóa đơn (trích ra để action ≤20 dòng). */
const MATTER_INVOICE_SELECT = {
  id: true,
  title: true,
  intakeId: true,
  intake: {
    select: {
      id: true,
      status: true,
      receivedAt: true,
      client: { select: { name: true } }
    }
  },
  primaryClientId: true,
  primaryClient: { select: { id: true, name: true, idNumber: true } },
  clientLinks: {
    select: {
      isPrimary: true,
      client: { select: { id: true, name: true, idNumber: true } }
    }
  }
} as const;

/**
 * v0.12: Liấy thông tin mặc định để xuất hóa đơn (tên đơn vị mua khách + id Intake liên quan)
 * Logic gộp khách (v0.42 mục 3) đã tách sang invoice-context-lib (thuần, có test).
 */
export async function getMatterInvoiceContext(matterId: string) {
  const session = await requireSession();
  await assertCanAccessMatter(session.user.id, session.user.role, matterId);
  const m = await prisma.matter.findUnique({
    where: { id: matterId },
    select: MATTER_INVOICE_SELECT
  });
  if (!m) throw new Error("Vụ án không tồn tại");
  return buildInvoiceContext(m, buildClientOptions(m.primaryClient, m.clientLinks));
}

/**
 * v0.12: Tạo yêu cầu xuất hóa đơn (kèm loại/danh mục/tên đơn vị mua/căn cứ)
 */
/** Thông báo cho vai trò duyệt sau khi tạo yêu cầu xuất hóa đơn (kèm tên vụ nếu có). */
/** Lấy nhãn vụ (mã + tiêu đề) cho thông báo; null nếu hóa đơn không liên kết vụ. */
async function findMatterLabel(matterId: string) {
  return prisma.matter.findUnique({
    where: { id: matterId },
    select: { internalCode: true, title: true }
  });
}

async function notifyInvoiceRequestCreated(
  actor: { id: string; name?: string | null },
  createdId: string,
  input: InvoiceRequestInput
): Promise<void> {
  const matter = input.matterId ? await findMatterLabel(input.matterId) : null;
  await notifyRoleApprovers({
    roles: ["ADMIN", "PRINCIPAL_LAWYER", "FINANCE"],
    excludeUserId: actor.id,
    title: "Có yêu cầu xuất hóa đơn mới cần duyệt",
    content: invoiceNotificationContent(actor.name, matter, input),
    href: "/finance", refType: "InvoiceRequest", refId: createdId, priority: "HIGH"
  });
}

export async function createInvoiceRequest(input: InvoiceRequestInput) {
  const session = await requireSession();
  // Validation thuần (giữ đúng thứ tự message của bản gốc — xem invoice-request-lib.test.ts)
  const roleViolation = invoiceRequestViolation(session.user.role, input);
  if (roleViolation) throw new Error(roleViolation);
  if (input.matterId) await assertCanAssociateMatter(session.user.id, input.matterId);
  const violation = invoiceValidationViolation(input);
  if (violation) throw new Error(violation);

  const created = await prisma.invoiceRequest.create({
    data: buildInvoiceRequestData(input, session.user.id),
    select: { id: true }
  });

  await notifyInvoiceRequestCreated(session.user, created.id, input);

  revalidatePath("/finance");
  if (input.matterId) revalidatePath(`/matters/${input.matterId}`);
  return created;
}

/** v0.43 mục 5: dùng cho popup xuất hóa đơn ở trang Tài chính — tìm vụ án hiện người dùng được liên kết (nhẹ, trả về mã + tiêu đề) */
export async function searchMattersForInvoice(q?: string) {
  const session = await requireSession();
  return prisma.matter.findMany({
    where: invoiceMatterSearchWhere(session.user.id, q),
    select: { id: true, internalCode: true, title: true },
    orderBy: { createdAt: "desc" },
    take: invoiceMatterSearchLimit(q)
  });
}

export async function listAllFeeEntries(params: {
  type?: "RECEIVABLE" | "RECEIVED" | "REFUND" | "COST" | "COMMISSION";
  limit?: number;
}) {
  const session = await requireSession();
  const visFilter = matterVisibilityFilter(session.user.id, session.user.role);
  return prisma.feeEntry.findMany({
    where: {
      ...(params.type ? { type: params.type } : {}),
      matter: { deletedAt: null, ...visFilter }
    },
    orderBy: { occurredAt: "desc" },
    take: params.limit ?? 100,
    include: {
      matter: { select: { id: true, internalCode: true, title: true } },
      beneficiaryUser: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, name: true } }
    }
  });
}

export async function getMonthlyRevenue(months = 6) {
  const session = await requireSession();
  const visFilter = matterVisibilityFilter(session.user.id, session.user.role);
  const start = revenueWindowStart(new Date(), months);

  const entries = await prisma.feeEntry.findMany({
    where: {
      type: { in: ["RECEIVABLE", "RECEIVED"] },
      occurredAt: { gte: start },
      matter: { deletedAt: null, ...visFilter }
    },
    select: { type: true, amount: true, occurredAt: true }
  });

  // Bucket + phân bổ (thuần, đã test — finance-stats-lib)
  return buildMonthlyRevenueBuckets(start, months, entries);
}

/** Tổng hoa hồng của 1 người từ mốc thời gian (dùng cho báo cáo thu nhập). */
async function commissionSum(userId: string, since: Date): Promise<number> {
  const r = await prisma.feeEntry.aggregate({
    where: { type: "COMMISSION", beneficiaryUserId: userId, occurredAt: { gte: since } },
    _sum: { amount: true }
  });
  return Number(r._sum.amount ?? 0);
}

export async function getPersonalRevenue(userId: string) {
  const session = await requireSession();
  if (!isManager(session.user.role) && session.user.id !== userId) {
    throw new Error("Chỉ được xem dữ liệu thu nhập của chính mình");
  }
  const now = new Date();
  const [monthlyCommission, yearlyCommission] = await Promise.all([
    commissionSum(userId, monthStartOf(now)),
    commissionSum(userId, yearStartOf(now))
  ]);
  return { monthlyCommission, yearlyCommission };
}

// ============ Bảng tuổi nợ (DATA-MODEL §4.31) ============

type AgingEntry = {
  matterId: string;
  type: FeeEntryType;
  amount: Prisma.Decimal;
  occurredAt: Date;
  matter: { internalCode: string; title: string; primaryClient: { name: string } | null };
};

/** Gom thu/chi nợ theo matter; anchor = RECEIVABLE xa nhất. */
function aggregateMatterFlows(entries: AgingEntry[]): Map<string, MatterAgg> {
  const map = new Map<string, MatterAgg>();
  for (const e of entries) {
    const agg = map.get(e.matterId) ?? { matterId: e.matterId, receivable: 0, received: 0, anchorAt: 0 };
    if (e.type === "RECEIVABLE") {
      agg.receivable += Number(e.amount);
      const t = e.occurredAt.getTime();
      agg.anchorAt = agg.anchorAt === 0 ? t : Math.min(agg.anchorAt, t);
    } else {
      agg.received += Number(e.amount);
    }
    map.set(e.matterId, agg);
  }
  return map;
}

export interface AgingViewRow {
  matterId: string;
  receivable: number;
  received: number;
  outstanding: number;
  ageDays: number;
  bucket: AgingBucketKey;
  internalCode: string;
  title: string;
  clientName: string | null;
}

function fetchAgingEntries(actor: { id: string; role: string }): Promise<AgingEntry[]> {
  const visFilter = matterVisibilityFilter(actor.id, actor.role);
  return prisma.feeEntry.findMany({
    where: { type: { in: ["RECEIVABLE", "RECEIVED"] }, matter: { deletedAt: null, ...visFilter } },
    select: {
      matterId: true,
      type: true,
      amount: true,
      occurredAt: true,
      matter: { select: { internalCode: true, title: true, primaryClient: { select: { name: true } } } }
    }
  });
}

function toViewRows(entries: AgingEntry[], rows: AgingRow[]): AgingViewRow[] {
  const meta = new Map(entries.map((e) => [e.matterId, e.matter]));
  return rows.map((r) => ({
    ...r,
    internalCode: meta.get(r.matterId)?.internalCode ?? "",
    title: meta.get(r.matterId)?.title ?? "",
    clientName: meta.get(r.matterId)?.primaryClient?.name ?? null
  }));
}

export async function getReceivablesAging(now = Date.now()) {
  const session = await requireSession();
  const entries = await fetchAgingEntries(session.user);
  const rows = buildAgingRows(Array.from(aggregateMatterFlows(entries).values()), now);
  const viewRows = toViewRows(entries, rows);
  const totalOutstanding = Math.round(viewRows.reduce((acc, r) => acc + r.outstanding, 0) * 100) / 100;
  return { rows: viewRows, summary: summarizeAging(rows), totalOutstanding };
}
