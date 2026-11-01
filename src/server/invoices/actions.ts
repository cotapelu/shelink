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
import { z } from "zod";
import { Prisma } from "@prisma/client";
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
import { storage } from "@/lib/storage";
import { validateUploadedFile } from "@/lib/storage/file-validator";
import { encryptBuffer, sha256 } from "@/lib/storage/crypto";
import { notifyRoleApprovers } from "@/server/notifications/approval";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function requireFinanceOrApprover(role: string) {
  if (role !== "FINANCE" && role !== "ADMIN" && role !== "PRINCIPAL_LAWYER") {
    throw new Error("Chỉ Tài chính / quản trị / luật sư chủ trì mới được xử lý hóa đơn");
  }
}

function canReviewInvoiceRequests(role: string) {
  return isManager(role) || role === "FINANCE";
}

function invoiceRequestVisibilityWhere(
  userId: string,
  role: string
): Prisma.InvoiceRequestWhereInput {
  if (canReviewInvoiceRequests(role)) return {};
  return {
    OR: [
      { requestedById: userId },
      {
        matter: {
          deletedAt: null,
          ...matterVisibilityFilter(userId, role)
        }
      }
    ]
  };
}

/** Luật sư gửi yêu cầu xuất hóa đơn từ chi tiết vụ án */
const createSchema = z.object({
  matterId: z.string().cuid(),
  amount: z.coerce.number().positive("Số tiền phải lớn hơn 0"),
  title: z.string().max(120).optional().or(z.literal("")),
  requestNote: z.string().max(500).optional().or(z.literal(""))
});

export async function createInvoiceRequest(input: z.infer<typeof createSchema>) {
  const session = await requireSession();
  const data = createSchema.parse(input);
  await assertCanAssociateMatter(session.user.id, data.matterId);
  await assertMatterWritable(data.matterId);

  await assertCanLeadMatter(session.user.id, data.matterId, "Chỉ luật sư chủ trì/hợp tác của vụ mới được yêu cầu xuất hóa đơn");

  const created = await prisma.invoiceRequest.create({
    data: {
      matterId: data.matterId,
      amount: data.amount,
      title: data.title?.trim() || null,
      requestNote: data.requestNote?.trim() || null,
      requestedById: session.user.id,
      status: "PENDING"
    }
  });

  await audit({
    userId: session.user.id,
    action: "INVOICE_REQUEST_CREATE",
    targetType: "InvoiceRequest",
    targetId: created.id,
    detail: { matterId: data.matterId, amount: data.amount }
  });

  const matter = await prisma.matter.findUnique({
    where: { id: data.matterId },
    select: { internalCode: true, title: true }
  });

  await notifyRoleApprovers({
    roles: ["ADMIN", "PRINCIPAL_LAWYER", "FINANCE"],
    excludeUserId: session.user.id,
    title: "Có yêu cầu xuất hóa đơn mới cần duyệt",
    content: `${session.user.name ?? "Người dùng"} đã gửi yêu cầu xuất hóa đơn: ${
      matter ? `${matter.internalCode} ${matter.title}` : "Không liên kết vụ án"
    }, số tiền ${data.amount.toLocaleString("vi-VN")} đồng`,
    href: "/finance",
    refType: "InvoiceRequest",
    refId: created.id,
    priority: "HIGH"
  });

  revalidatePath(`/matters/${data.matterId}`);
  revalidatePath("/finance");
  return { ok: true, id: created.id };
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
    include: {
      matter: { select: { id: true, internalCode: true, title: true } },
      requestedBy: { select: { id: true, name: true } },
      processedBy: { select: { id: true, name: true } },
      contractScan: { select: { id: true, name: true } },
      invoiceFile: { select: { id: true, name: true } }
    }
  });

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

export async function listInvoiceRequestsByMatter(matterId: string) {
  const session = await requireSession();
  await assertCanAccessMatter(session.user.id, session.user.role, matterId);
  return prisma.invoiceRequest.findMany({
    where: { matterId },
    orderBy: { requestedAt: "desc" },
    include: {
      requestedBy: { select: { id: true, name: true } },
      processedBy: { select: { id: true, name: true } },
      contractScan: { select: { id: true, name: true } },
      invoiceFile: { select: { id: true, name: true } }
    }
  });
}

/**
 * Tài chính duyệt + tải lên hóa đơn điện tử. FormData:
 *   requestId, processNote?, contractScan(File?), invoiceFile(File?)
 * - Không gửi invoiceFile: trạng thái APPROVED
 * - Có gửi invoiceFile: trạng thái ISSUED
 *
 * contractScan chỉ giữ để tương thích luồng dữ liệu cũ; căn cứ của yêu cầu do người yêu cầu tải lên evidenceDocIds.
 */
export async function approveInvoiceRequest(formData: FormData) {
  const session = await requireSession();
  requireFinanceOrApprover(session.user.role);

  const requestId = formData.get("requestId");
  if (typeof requestId !== "string" || !requestId) throw new Error("Thiếu requestId");

  const existing = await prisma.invoiceRequest.findUnique({
    where: { id: requestId },
    select: { id: true, matterId: true, status: true }
  });
  if (!existing) throw new Error("Yêu cầu không tồn tại");
  if (existing.status === "ISSUED") throw new Error("Yêu cầu này đã xuất hóa đơn");
  if (existing.status === "REJECTED") throw new Error("Yêu cầu này đã bị từ chối");

  const processNote = formData.get("processNote");
  const contractScan = formData.get("contractScan");
  const invoiceFile = formData.get("invoiceFile");
  // v0.14: Số hóa đơn thực (kế toán điền lại khi duyệt/xuất)
  const invoiceNo = formData.get("invoiceNo");

  // File uploads (external, cannot be rolled back) happen first
  let contractScanDocId: string | undefined;
  let invoiceFileDocId: string | undefined;
  let contractScanMeta: { name: string; type: string; size: number; raw: Buffer; enc: ReturnType<typeof encryptBuffer>; path: string } | undefined;
  let invoiceFileMeta: { name: string; type: string; size: number; raw: Buffer; enc: ReturnType<typeof encryptBuffer>; path: string } | undefined;
  let createContractDoc = false;
  let createInvoiceDoc = false;

  if (contractScan instanceof File && contractScan.size > 0) {
    validateUploadedFile(contractScan, { purpose: "invoice", maxBytes: MAX_FILE_SIZE });
    const raw = Buffer.from(await contractScan.arrayBuffer());
    const enc = encryptBuffer(raw);
    const path = await storage.writeFile(storageScope(existing.matterId, requestId), enc.ciphertext);
    contractScanMeta = { name: contractScan.name, type: contractScan.type, size: contractScan.size, raw, enc, path };
    createContractDoc = true;
  }

  if (invoiceFile instanceof File && invoiceFile.size > 0) {
    validateUploadedFile(invoiceFile, { purpose: "invoice", maxBytes: MAX_FILE_SIZE });
    const raw = Buffer.from(await invoiceFile.arrayBuffer());
    const enc = encryptBuffer(raw);
    const path = await storage.writeFile(storageScope(existing.matterId, requestId), enc.ciphertext);
    invoiceFileMeta = { name: invoiceFile.name, type: invoiceFile.type, size: invoiceFile.size, raw, enc, path };
    createInvoiceDoc = true;
  }

  const finalStatus = invoiceFileDocId
    ? ("ISSUED" as const)
    : contractScanDocId
      ? ("APPROVED" as const)
      : ("APPROVED" as const);

  const invoiceNoStr =
    typeof invoiceNo === "string" && invoiceNo.trim() ? invoiceNo.trim() : null;

  // All DB writes in a single transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // Create document records if files were uploaded
    if (createContractDoc && contractScanMeta) {
      const { name, type, size, raw, enc, path } = contractScanMeta;
      const doc = await tx.document.create({
        data: {
          matterId: existing.matterId,
          name,
          category: "CONTRACT",
          path,
          mimeType: type || "application/octet-stream",
          size,
          sha256: sha256(raw),
          encrypted: true,
          algorithm: enc.algorithm,
          iv: enc.iv.toString("base64"),
          authTag: enc.authTag.toString("base64"),
          tags: ["Yêu cầu hóa đơn"],
          uploadedById: session.user.id
        }
      });
      contractScanDocId = doc.id;
    }

    if (createInvoiceDoc && invoiceFileMeta) {
      const { name, type, size, raw, enc, path } = invoiceFileMeta;
      const doc = await tx.document.create({
        data: {
          matterId: existing.matterId,
          name,
          category: "OTHER",
          path,
          mimeType: type || "application/octet-stream",
          size,
          sha256: sha256(raw),
          encrypted: true,
          algorithm: enc.algorithm,
          iv: enc.iv.toString("base64"),
          authTag: enc.authTag.toString("base64"),
          tags: ["Hóa đơn điện tử"],
          uploadedById: session.user.id
        }
      });
      invoiceFileDocId = doc.id;
    }

    await tx.invoiceRequest.update({
      where: { id: requestId },
      data: {
        status: finalStatus,
        processNote: typeof processNote === "string" ? processNote.trim() || null : null,
        processedById: session.user.id,
        processedAt: new Date(),
        ...(contractScanDocId ? { contractScanId: contractScanDocId } : {}),
        ...(invoiceFileDocId ? { invoiceFileId: invoiceFileDocId } : {}),
        ...(finalStatus === "ISSUED" && invoiceNoStr
          ? { invoiceNo: invoiceNoStr, issuedAt: new Date() }
          : {})
      }
    });
  });

  await audit({
    userId: session.user.id,
    action: finalStatus === "ISSUED" ? "INVOICE_ISSUED" : "INVOICE_APPROVED",
    targetType: "InvoiceRequest",
    targetId: requestId,
    detail: {
      matterId: existing.matterId,
      hasContract: !!contractScanDocId,
      hasInvoice: !!invoiceFileDocId
    }
  });

  if (existing.matterId) revalidatePath(`/matters/${existing.matterId}`);
  revalidatePath("/finance");
  return { ok: true, status: finalStatus };
}

function storageScope(matterId: string | null, requestId: string) {
  return matterId ? `m_${matterId}` : `invoice_${requestId}`;
}

const rejectSchema = z.object({
  requestId: z.string().cuid(),
  reason: z.string().min(1, "Vui lòng nêu lý do từ chối").max(500)
});

export async function rejectInvoiceRequest(input: z.infer<typeof rejectSchema>) {
  const session = await requireSession();
  requireFinanceOrApprover(session.user.role);
  const data = rejectSchema.parse(input);

  const existing = await prisma.invoiceRequest.findUnique({
    where: { id: data.requestId },
    select: { matterId: true, status: true }
  });
  if (!existing) throw new Error("Yêu cầu không tồn tại");
  if (existing.status === "ISSUED") throw new Error("Yêu cầu đã xuất hóa đơn không thể từ chối");

  await prisma.invoiceRequest.update({
    where: { id: data.requestId },
    data: {
      status: "REJECTED",
      processNote: data.reason,
      processedById: session.user.id,
      processedAt: new Date()
    }
  });

  await audit({
    userId: session.user.id,
    action: "INVOICE_REJECTED",
    targetType: "InvoiceRequest",
    targetId: data.requestId,
    detail: { matterId: existing.matterId, reason: data.reason }
  });

  if (existing.matterId) revalidatePath(`/matters/${existing.matterId}`);
  revalidatePath("/finance");
  return { ok: true };
}

/** KPI trang tài chính: tổng đã xuất HĐ trong tháng */
export async function getInvoiceStats() {
  const session = await requireSession();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const visibilityWhere = invoiceRequestVisibilityWhere(session.user.id, session.user.role);
  const issued = await prisma.invoiceRequest.aggregate({
    where: {
      ...visibilityWhere,
      status: "ISSUED",
      processedAt: { gte: monthStart }
    },
    _sum: { amount: true },
    _count: true
  });
  const pendingCount = await prisma.invoiceRequest.count({
    where: {
      ...visibilityWhere,
      status: "PENDING"
    }
  });
  return {
    monthlyIssued: Number(issued._sum.amount ?? 0),
    monthlyIssuedCount: issued._count,
    pendingCount
  };
}
