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
import { audit } from "@/server/audit";
import { assertMatterWritable } from "@/lib/archive/guard";
import {
  assertCanAccessMatter,
  assertCanAssociateMatter,
  assertCanLeadMatter,
  isManager,
  matterVisibilityFilter
} from "@/lib/permissions";
import {
  billingCreateSchema,
  feeEntryCreateSchema,
  commissionPlanSetSchema,
  type BillingCreateInput,
  type FeeEntryCreateInput,
  type CommissionPlanSetInput
} from "./schemas";
import { notifyRoleApprovers } from "@/server/notifications/approval";
import {
  invoiceMatterSearchLimit,
  invoiceMatterSearchWhere
} from "./invoice-matter-search";
import { buildAgingRows, summarizeAging, type AgingBucketKey, type AgingRow, type MatterAgg } from "./aging";

// ============ Billing ============

export async function createBilling(input: BillingCreateInput) {
  const session = await requireSession();
  const data = billingCreateSchema.parse(input);
  await assertMatterWritable(data.matterId, { allowFinanceRole: true });

  const created = await prisma.billing.create({
    data: {
      matterId: data.matterId,
      title: data.title,
      contractAmount: new Prisma.Decimal(data.contractAmount),
      schedule: data.schedule || null,
      status: data.status,
      signedAt: data.signedAt
    }
  });

  await audit({
    userId: session.user.id,
    action: "BILLING_CREATE",
    targetType: "Billing",
    targetId: created.id,
    detail: { matterId: data.matterId }
  });

  revalidatePath(`/matters/${data.matterId}`);
  return { ok: true, id: created.id };
}

export async function deleteBilling(id: string) {
  const session = await requireSession();
  const billing = await prisma.billing.findUnique({
    where: { id },
    select: { matterId: true }
  });
  if (!billing) return { ok: false };

  if (session.user.role === "FINANCE") {
    await assertMatterWritable(billing.matterId, { allowFinanceRole: true });
  } else {
    await assertMatterWritable(billing.matterId);
    await assertCanLeadMatter(session.user.id, billing.matterId, "Chỉ chủ trì / hợp tác viên của vụ hoặc Tài chính mới được xóa hợp đồng");
  }

  await prisma.billing.delete({ where: { id } });
  await audit({
    userId: session.user.id,
    action: "BILLING_DELETE",
    targetType: "Billing",
    targetId: id
  });
  revalidatePath(`/matters/${billing.matterId}`);
  return { ok: true };
}

// ============ FeeEntry + tự động chia hoa hồng ============

/**
 * Tạo một bản ghi thu chi.
 * - Khi tạo RECEIVED thì tự động sinh các dòng con COMMISSION theo CommissionPlan (mỗi người hưởng một dòng)
 * - parent / children liên kết qua parentFeeEntryId
 */
export async function createFeeEntry(input: FeeEntryCreateInput) {
  const session = await requireSession();
  const data = feeEntryCreateSchema.parse(input);
  await assertMatterWritable(data.matterId, { allowFinanceRole: true });

  const created = await prisma.$transaction(async (tx) => {
    const entry = await tx.feeEntry.create({
      data: {
        matterId: data.matterId,
        billingId: data.billingId || null,
        type: data.type,
        amount: new Prisma.Decimal(data.amount),
        occurredAt: data.occurredAt,
        invoiceNo: data.invoiceNo || null,
        payerOrPayee: data.payerOrPayee || null,
        method: data.method || null,
        note: data.note || null,
        recordedById: session.user.id
      }
    });

    // Tự động chia hoa hồng
    if (data.type === "RECEIVED" && data.amount > 0) {
      const plans = await tx.commissionPlan.findMany({
        where: { matterId: data.matterId, active: true }
      });
      for (const plan of plans) {
        const share = Number(plan.percent) * data.amount / 100;
        if (share <= 0) continue;
        await tx.feeEntry.create({
          data: {
            matterId: data.matterId,
            billingId: data.billingId || null,
            type: "COMMISSION",
            amount: new Prisma.Decimal(share.toFixed(2)),
            occurredAt: data.occurredAt,
            parentFeeEntryId: entry.id,
            beneficiaryUserId: plan.userId,
            note: plan.label ? `Tự động chia theo phương án [${plan.label}] ${plan.percent}%` : `Tự động chia ${plan.percent}%`,
            recordedById: session.user.id
          }
        });
      }
    }

    // Sự kiện thu tiền thực tế ghi vào dòng thời gian
    if (data.type === "RECEIVED") {
      await tx.timelineEvent.create({
        data: {
          matterId: data.matterId,
          eventType: "FEE_RECEIVED",
          title: `Đã thu ¥${data.amount.toLocaleString("vi-VN")}`,
          content: data.note ?? undefined,
          occurredAt: data.occurredAt
        }
      });
    }

    return entry;
  });

  await audit({
    userId: session.user.id,
    action: "FEE_ENTRY_CREATE",
    targetType: "FeeEntry",
    targetId: created.id,
    detail: { matterId: data.matterId, type: data.type, amount: data.amount }
  });

  revalidatePath(`/matters/${data.matterId}`);
  revalidatePath("/finance");
  return { ok: true, id: created.id };
}

export async function deleteFeeEntry(id: string) {
  const session = await requireSession();
  if (!isManager(session.user.role) && session.user.role !== "FINANCE") {
    throw new Error("Chỉ quản trị, luật sư chủ trì hoặc Tài chính mới được xóa bản ghi thu chi");
  }
  const entry = await prisma.feeEntry.findUnique({
    where: { id },
    include: { commissionChildren: { select: { id: true } } }
  });
  if (!entry) return { ok: false };
  await assertMatterWritable(entry.matterId, { allowFinanceRole: true });

  // Khi xóa dòng cha thì xóa luôn các khoản chia hoa hồng tự động sinh ra
  await prisma.$transaction(async (tx) => {
    if (entry.commissionChildren.length > 0) {
      await tx.feeEntry.deleteMany({
        where: { id: { in: entry.commissionChildren.map((c) => c.id) } }
      });
    }
    await tx.feeEntry.delete({ where: { id } });
  });

  await audit({
    userId: session.user.id,
    action: "FEE_ENTRY_DELETE",
    targetType: "FeeEntry",
    targetId: id,
    detail: {
      matterId: entry.matterId,
      cascadedChildren: entry.commissionChildren.length
    }
  });
  revalidatePath(`/matters/${entry.matterId}`);
  revalidatePath("/finance");
  return { ok: true };
}

// ============ CommissionPlan ============

/**
 * Thay thế toàn bộ phương án chia hoa hồng của vụ.
 * Cách đơn giản: xóa mọi plan hiện có, tạo mới theo items.
 */
export async function setCommissionPlan(input: CommissionPlanSetInput) {
  const session = await requireSession();
  const data = commissionPlanSetSchema.parse(input);
  await assertMatterWritable(data.matterId);
  await assertCanLeadMatter(session.user.id, data.matterId, "Chỉ chủ trì / hợp tác viên của vụ mới được đặt phương án chia hoa hồng");

  await prisma.$transaction([
    prisma.commissionPlan.deleteMany({ where: { matterId: data.matterId } }),
    prisma.commissionPlan.createMany({
      data: data.items.map((it) => ({
        matterId: data.matterId,
        userId: it.userId,
        percent: new Prisma.Decimal(it.percent),
        label: it.label || null,
        active: true
      }))
    })
  ]);

  await audit({
    userId: session.user.id,
    action: "COMMISSION_PLAN_SET",
    targetType: "Matter",
    targetId: data.matterId,
    detail: { itemCount: data.items.length }
  });

  revalidatePath(`/matters/${data.matterId}`);
  return { ok: true };
}

// ============ Thống kê tài chính toàn cục ============

export async function getMatterFinance(matterId: string) {
  const session = await requireSession();
  await assertCanAccessMatter(session.user.id, session.user.role, matterId);

  const [billings, entries, plans, issuedInvoices] = await Promise.all([
    prisma.billing.findMany({
      where: { matterId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.feeEntry.findMany({
      where: { matterId },
      orderBy: { occurredAt: "desc" },
      include: {
        beneficiaryUser: { select: { id: true, name: true } },
        parentFeeEntry: { select: { id: true, type: true } }
      }
    }),
    prisma.commissionPlan.findMany({
      where: { matterId },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "asc" }
    }),
    // Số tiền đã xuất hóa đơn: tổng các hóa đơn đã xuất
    prisma.invoiceRequest.findMany({
      where: { matterId, status: "ISSUED" },
      select: { amount: true }
    })
  ]);

  const sum = (filter: (e: (typeof entries)[number]) => boolean) =>
    entries.filter(filter).reduce((acc, e) => acc + Number(e.amount), 0);

  const stats = {
    contractAmount: billings.reduce((acc, b) => acc + Number(b.contractAmount), 0),
    receivable: sum((e) => e.type === "RECEIVABLE"),
    received: sum((e) => e.type === "RECEIVED"),
    refund: sum((e) => e.type === "REFUND"),
    cost: sum((e) => e.type === "COST"),
    commission: sum((e) => e.type === "COMMISSION"),
    invoiced: issuedInvoices.reduce((acc, i) => acc + Number(i.amount), 0)
  };

  return { billings, entries, plans, stats };
}

/**
 * v0.11: Liệt kê các yêu cầu xuất hóa đơn của vụ
 */
export async function listMatterInvoiceRequests(matterId: string) {
  const session = await requireSession();
  await assertCanAccessMatter(session.user.id, session.user.role, matterId);
  return prisma.invoiceRequest.findMany({
    where: { matterId },
    orderBy: { requestedAt: "desc" },
    select: {
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
    }
  });
}

/**
 * v0.12: Lấy thông tin mặc định để xuất hóa đơn (tên đơn vị mua khách + id Intake liên quan)
 */
export async function getMatterInvoiceContext(matterId: string) {
  const session = await requireSession();
  await assertCanAccessMatter(session.user.id, session.user.role, matterId);
  const m = await prisma.matter.findUnique({
    where: { id: matterId },
    select: {
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
    }
  });
  if (!m) throw new Error("Vụ án không tồn tại");

  // v0.42 mục 3: dropdown tên đơn vị mua = toàn bộ khách liên kết với vụ (đã loại trùng, khách chính lên đầu)
  const clientMap = new Map<
    string,
    { id: string; name: string; taxNo: string | null; isPrimary: boolean }
  >();
  if (m.primaryClient) {
    clientMap.set(m.primaryClient.id, {
      id: m.primaryClient.id,
      name: m.primaryClient.name,
      taxNo: m.primaryClient.idNumber ?? null,
      isPrimary: true
    });
  }
  for (const link of m.clientLinks) {
    if (!link.client) continue;
    const existing = clientMap.get(link.client.id);
    if (existing) {
      existing.isPrimary = existing.isPrimary || link.isPrimary;
    } else {
      clientMap.set(link.client.id, {
        id: link.client.id,
        name: link.client.name,
        taxNo: link.client.idNumber ?? null,
        isPrimary: link.isPrimary
      });
    }
  }
  const clientOptions = Array.from(clientMap.values()).sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary)
  );

  return {
    matterId: m.id,
    matterTitle: m.title,
    intakeId: m.intakeId ?? null,
    intake: m.intake
      ? {
          id: m.intake.id,
          status: m.intake.status,
          receivedAt: m.intake.receivedAt,
          clientName: m.intake.client?.name ?? null
        }
      : null,
    clientOptions,
    defaultBuyerName:
      m.primaryClient?.name ?? m.intake?.client?.name ?? null
  };
}

/**
 * v0.12: Tạo yêu cầu xuất hóa đơn (kèm loại/danh mục/tên đơn vị mua/căn cứ)
 */
export async function createInvoiceRequest(input: {
  // v0.43 mục 5: matterId có thể null — xuất hóa đơn không liên kết vụ án bắt buộc điền noMatterReason
  matterId: string | null;
  noMatterReason?: string | null;
  amount: number;
  invoiceType: "PLAIN" | "SPECIAL";
  invoiceItem: "LAWYER_FEE" | "CONSULTING_FEE" | "AGENCY_FEE" | "OTHER";
  buyerName: string;
  buyerTaxNo?: string | null;
  // v0.42 mục 4: 6 yếu tố bên mua của hóa đơn GTGT đặc biệt (bắt buộc với hóa đơn đặc biệt)
  buyerAddress?: string | null;
  buyerPhone?: string | null;
  buyerBank?: string | null;
  buyerBankAccount?: string | null;
  evidenceDocIds: string[];
  requestNote?: string | null;
}) {
  const session = await requireSession();
  if (input.matterId) {
    await assertCanAssociateMatter(session.user.id, input.matterId);
  } else {
    // Xuất hóa đơn không liên kết vụ án chỉ Tài chính / quản trị / chủ nhiệm được tạo, và bắt buộc phải nêu lý do
    if (!isManager(session.user.role) && session.user.role !== "FINANCE") {
      throw new Error("Chỉ Tài chính / quản trị / luật sư chủ trì mới được tạo hóa đơn không liên kết vụ án");
    }
    if (!input.noMatterReason?.trim()) {
      throw new Error("Khi không liên kết vụ án bắt buộc phải nhập lý do");
    }
  }

  if (input.amount <= 0) throw new Error("Số tiền phải lớn hơn 0");
  if (input.invoiceType !== "PLAIN" && input.invoiceType !== "SPECIAL") {
    throw new Error("Vui lòng chọn loại hóa đơn");
  }
  if (!input.buyerName.trim()) throw new Error("Vui lòng nhập tên đơn vị mua");
  // Kiểm tra tuân thủ hóa đơn đặc biệt (điều 1 Thông báo về sử dụng và quản lý hóa đơn GTGT đặc biệt + 6 yếu tố bên mua)
  if (input.invoiceType === "SPECIAL") {
    if (!input.buyerTaxNo?.trim()) throw new Error("Hóa đơn GTGT đặc biệt bắt buộc phải có mã số thuế người nộp thuế");
    if (!input.buyerAddress?.trim()) throw new Error("Hóa đơn GTGT đặc biệt bắt buộc phải có địa chỉ bên mua");
    if (!input.buyerPhone?.trim()) throw new Error("Hóa đơn GTGT đặc biệt bắt buộc phải có điện thoại bên mua");
    if (!input.buyerBank?.trim()) throw new Error("Hóa đơn GTGT đặc biệt bắt buộc phải có ngân hàng mở tài khoản");
    if (!input.buyerBankAccount?.trim()) throw new Error("Hóa đơn GTGT đặc biệt bắt buộc phải có số tài khoản ngân hàng");
  }
  // Khi có liên kết vụ án bắt buộc phải tải lên căn cứ xuất hóa đơn (hợp đồng ủy quyền...); khi không liên kết vụ án thì thay bằng lý do, căn cứ là tùy chọn
  if (input.matterId && input.evidenceDocIds.length === 0) {
    throw new Error("Vui lòng tải lên ít nhất một căn cứ xuất hóa đơn (hợp đồng ủy quyền bản scan...)");
  }

  const isSpecial = input.invoiceType === "SPECIAL";
  const created = await prisma.invoiceRequest.create({
    data: {
      matterId: input.matterId,
      noMatterReason: input.matterId ? null : input.noMatterReason?.trim() || null,
      amount: input.amount,
      invoiceType: input.invoiceType,
      invoiceItem: input.invoiceItem,
      buyerName: input.buyerName.trim(),
      buyerTaxNo: input.buyerTaxNo?.trim() || null,
      buyerAddress: isSpecial ? input.buyerAddress?.trim() || null : null,
      buyerPhone: isSpecial ? input.buyerPhone?.trim() || null : null,
      buyerBank: isSpecial ? input.buyerBank?.trim() || null : null,
      buyerBankAccount: isSpecial ? input.buyerBankAccount?.trim() || null : null,
      evidenceDocIds: input.evidenceDocIds,
      title: input.buyerName.trim(),
      requestNote: input.requestNote?.trim() || null,
      requestedById: session.user.id
    },
    select: { id: true }
  });

  const matter = input.matterId
    ? await prisma.matter.findUnique({
        where: { id: input.matterId },
        select: { internalCode: true, title: true }
      })
    : null;

  await notifyRoleApprovers({
    roles: ["ADMIN", "PRINCIPAL_LAWYER", "FINANCE"],
    excludeUserId: session.user.id,
    title: "Có yêu cầu xuất hóa đơn mới cần duyệt",
    content: `${session.user.name ?? "Người dùng"} đã gửi yêu cầu xuất hóa đơn: ${
      matter ? `${matter.internalCode} ${matter.title}` : input.noMatterReason?.trim() || "Không liên kết vụ án"
    }, số tiền ${input.amount.toLocaleString("vi-VN")} đồng`,
    href: "/finance",
    refType: "InvoiceRequest",
    refId: created.id,
    priority: "HIGH"
  });

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
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const entries = await prisma.feeEntry.findMany({
    where: {
      type: { in: ["RECEIVABLE", "RECEIVED"] },
      occurredAt: { gte: start },
      matter: { deletedAt: null, ...visFilter }
    },
    select: { type: true, amount: true, occurredAt: true }
  });

  const buckets: { month: string; received: number; receivable: number }[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    buckets.push({
      month: `Tháng ${d.getMonth() + 1}`,
      received: 0,
      receivable: 0
    });
  }

  for (const e of entries) {
    const d = new Date(e.occurredAt);
    const idx = (d.getFullYear() - start.getFullYear()) * 12 + d.getMonth() - start.getMonth();
    if (idx < 0 || idx >= months) continue;
    if (e.type === "RECEIVED") buckets[idx].received += Number(e.amount);
    if (e.type === "RECEIVABLE") buckets[idx].receivable += Number(e.amount);
  }

  return buckets;
}

export async function getPersonalRevenue(userId: string) {
  const session = await requireSession();
  if (!isManager(session.user.role) && session.user.id !== userId) {
    throw new Error("Chỉ được xem dữ liệu thu nhập của chính mình");
  }
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const yearStart = new Date(monthStart.getFullYear(), 0, 1);

  const [monthly, yearly] = await Promise.all([
    prisma.feeEntry.aggregate({
      where: {
        type: "COMMISSION",
        beneficiaryUserId: userId,
        occurredAt: { gte: monthStart }
      },
      _sum: { amount: true }
    }),
    prisma.feeEntry.aggregate({
      where: {
        type: "COMMISSION",
        beneficiaryUserId: userId,
        occurredAt: { gte: yearStart }
      },
      _sum: { amount: true }
    })
  ]);

  return {
    monthlyCommission: Number(monthly._sum.amount ?? 0),
    yearlyCommission: Number(yearly._sum.amount ?? 0)
  };
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
