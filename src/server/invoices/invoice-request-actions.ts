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
/**
 * Yêu cầu xuất hóa đơn (tạo + liệt kê) — tách từ invoices/actions.ts (AUTO-67e).
 */
"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanAccessMatter, assertCanAssociateMatter, assertCanLeadMatter } from "@/lib/permissions";
import { notifyRoleApprovers } from "@/server/notifications/approval";
import { finishInvoiceFlow, invoiceRequestVisibilityWhere } from "./invoice-visibility";

/** Luật sư gửi yêu cầu xuất hóa đơn từ chi tiết vụ án */
const createSchema = z.object({
  matterId: z.string().cuid(),
  amount: z.coerce.number().positive("Số tiền phải lớn hơn 0"),
  title: z.string().max(120).optional().or(z.literal("")),
  requestNote: z.string().max(500).optional().or(z.literal(""))
});

async function notifyApprovers(session: { user: { id: string; name?: string | null } }, createdId: string, matterId: string, amount: number) {
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: { internalCode: true, title: true }
  });
  await notifyRoleApprovers({
    roles: ["ADMIN", "PRINCIPAL_LAWYER", "FINANCE"],
    excludeUserId: session.user.id,
    title: "Có yêu cầu xuất hóa đơn mới cần duyệt",
    content: `${session.user.name ?? "Người dùng"} đã gửi yêu cầu xuất hóa đơn: ${
      matter ? `${matter.internalCode} ${matter.title}` : "Không liên kết vụ án"
    }, số tiền ${amount.toLocaleString("vi-VN")} đồng`,
    href: "/finance",
    refType: "InvoiceRequest",
    refId: createdId,
    priority: "HIGH"
  });
}

async function assertCanRequestInvoice(userId: string, matterId: string) {
  await assertCanAssociateMatter(userId, matterId);
  await assertMatterWritable(matterId);
  await assertCanLeadMatter(userId, matterId, "Chỉ luật sư chủ trì/hợp tác của vụ mới được yêu cầu xuất hóa đơn");
}

function invoiceRequestCreateData(userId: string, data: z.infer<typeof createSchema>) {
  return {
    matterId: data.matterId,
    amount: data.amount,
    title: data.title?.trim() || null,
    requestNote: data.requestNote?.trim() || null,
    requestedById: userId,
    status: "PENDING" as const
  };
}

export async function createInvoiceRequest(input: z.infer<typeof createSchema>) {
  const session = await requireSession();
  const data = createSchema.parse(input);
  await assertCanRequestInvoice(session.user.id, data.matterId);

  const created = await prisma.invoiceRequest.create({ data: invoiceRequestCreateData(session.user.id, data) });
  await audit({ userId: session.user.id, action: "INVOICE_REQUEST_CREATE", targetType: "InvoiceRequest", targetId: created.id, detail: { matterId: data.matterId, amount: data.amount } });
  await notifyApprovers(session, created.id, data.matterId, data.amount);
  finishInvoiceFlow(data.matterId);
  return { ok: true, id: created.id };
}

const REQUEST_INCLUDE = {
  matter: { select: { id: true, internalCode: true, title: true } },
  requestedBy: { select: { id: true, name: true } },
  processedBy: { select: { id: true, name: true } },
  contractScan: { select: { id: true, name: true } },
  invoiceFile: { select: { id: true, name: true } }
} satisfies Prisma.InvoiceRequestInclude;

async function attachEvidenceDocs<T extends { evidenceDocIds: string[]; amount: unknown }>(rows: T[]) {
  const evidenceIds = Array.from(new Set(rows.flatMap((row) => row.evidenceDocIds)));
  const docs = evidenceIds.length
    ? await prisma.document.findMany({
        where: { id: { in: evidenceIds }, deletedAt: null },
        select: { id: true, name: true, size: true, mimeType: true, createdAt: true }
      })
    : [];
  const docMap = new Map(docs.map((doc) => [doc.id, doc]));
  return rows.map((row) => ({
    ...row,
    amount: Number(row.amount),
    evidenceDocs: row.evidenceDocIds
      .map((id) => docMap.get(id))
      .filter((doc): doc is (typeof docs)[number] => Boolean(doc))
  }));
}

export async function listInvoiceRequests(filter?: { status?: "PENDING" | "ISSUED" | "REJECTED" | "APPROVED" }) {
  const session = await requireSession();
  const where: Prisma.InvoiceRequestWhereInput = {
    ...invoiceRequestVisibilityWhere(session.user.id, session.user.role),
    ...(filter?.status ? { status: filter.status } : {})
  };
  const rows = await prisma.invoiceRequest.findMany({
    where,
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
    include: REQUEST_INCLUDE
  });
  return attachEvidenceDocs(rows);
}

export async function listInvoiceRequestsByMatter(matterId: string) {
  const session = await requireSession();
  await assertCanAccessMatter(session.user.id, session.user.role, matterId);
  return prisma.invoiceRequest.findMany({
    where: { matterId },
    orderBy: { requestedAt: "desc" },
    include: REQUEST_INCLUDE
  });
}
