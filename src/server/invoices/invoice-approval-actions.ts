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
 * Duyệt / từ chối / thống kê yêu cầu hóa đơn — tách từ invoices/actions.ts (AUTO-67e).
 *
 * Sửa bug AUTO-67e: `finalStatus` trước đây tính từ biến chỉ được gán BÊN TRONG $transaction
 * nên MÃI MÃI là "APPROVED" kể cả khi có tải lên hóa đơn điện tử → giờ tính từ form data.
 */
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { storage } from "@/lib/storage";
import { validateUploadedFile } from "@/lib/storage/file-validator";
import { encryptBuffer, sha256 } from "@/lib/storage/crypto";
import {
  MAX_FILE_SIZE,
  finishInvoiceFlow,
  invoiceRequestVisibilityWhere,
  requireFinanceOrApprover
} from "./invoice-visibility";

type UploadMeta = {
  name: string;
  type: string;
  size: number;
  raw: Buffer;
  enc: ReturnType<typeof encryptBuffer>;
  path: string;
};

type ApprovalForm = {
  requestId: string;
  processNote: string | null;
  invoiceNo: string | null;
  contractScan: File | null;
  invoiceFile: File | null;
};

function trimOrNull(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function fileOrNull(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}

async function loadRequestForApproval(requestId: string) {
  const existing = await prisma.invoiceRequest.findUnique({
    where: { id: requestId },
    select: { id: true, matterId: true, status: true }
  });
  if (!existing) throw new Error("Yêu cầu không tồn tại");
  if (existing.status === "ISSUED") throw new Error("Yêu cầu này đã xuất hóa đơn");
  if (existing.status === "REJECTED") throw new Error("Yêu cầu này đã bị từ chối");
  return existing;
}

function readApprovalForm(formData: FormData): ApprovalForm {
  const requestId = formData.get("requestId");
  if (typeof requestId !== "string" || !requestId) throw new Error("Thiếu requestId");
  const contractScan = formData.get("contractScan");
  const invoiceFile = formData.get("invoiceFile");
  return {
    requestId,
    processNote: trimOrNull(formData.get("processNote")),
    invoiceNo: trimOrNull(formData.get("invoiceNo")),
    contractScan: fileOrNull(contractScan),
    invoiceFile: fileOrNull(invoiceFile)
  };
}

async function prepareUpload(file: File, scope: string): Promise<UploadMeta> {
  validateUploadedFile(file, { purpose: "invoice", maxBytes: MAX_FILE_SIZE });
  const raw = Buffer.from(await file.arrayBuffer());
  const enc = encryptBuffer(raw);
  const path = await storage.writeFile(scope, enc.ciphertext);
  return { name: file.name, type: file.type, size: file.size, raw, enc, path };
}

function storageScope(matterId: string | null, requestId: string) {
  return matterId ? `m_${matterId}` : `invoice_${requestId}`;
}

function uploadDocData(meta: UploadMeta, matterId: string | null, userId: string, category: "CONTRACT" | "OTHER", tags: string[]) {
  return {
    matterId,
    name: meta.name,
    category,
    path: meta.path,
    mimeType: meta.type || "application/octet-stream",
    size: meta.size,
    sha256: sha256(meta.raw),
    encrypted: true,
    algorithm: meta.enc.algorithm,
    iv: meta.enc.iv.toString("base64"),
    authTag: meta.enc.authTag.toString("base64"),
    tags,
    uploadedById: userId
  };
}

async function createInvoiceDoc(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  meta: UploadMeta,
  matterId: string | null,
  userId: string,
  category: "CONTRACT" | "OTHER",
  tags: string[]
) {
  return tx.document.create({ data: uploadDocData(meta, matterId, userId, category, tags) });
}

function invoiceRequestApproveData(
  session: { user: { id: string } },
  form: ApprovalForm,
  status: "APPROVED" | "ISSUED",
  contractScanDocId: string | undefined,
  invoiceFileDocId: string | undefined
) {
  return {
    status,
    processNote: form.processNote,
    processedById: session.user.id,
    processedAt: new Date(),
    ...(contractScanDocId ? { contractScanId: contractScanDocId } : {}),
    ...(invoiceFileDocId ? { invoiceFileId: invoiceFileDocId } : {}),
    ...(status === "ISSUED" && form.invoiceNo
      ? { invoiceNo: form.invoiceNo, issuedAt: new Date() }
      : {})
  };
}

function approvalDocId(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  meta: UploadMeta | null,
  matterId: string | null,
  userId: string,
  category: "CONTRACT" | "OTHER",
  tags: string[]
) {
  if (!meta) return Promise.resolve(undefined);
  return createInvoiceDoc(tx, meta, matterId, userId, category, tags).then((doc) => doc.id);
}

async function runApprovalTransaction(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  existing: { matterId: string | null },
  form: ApprovalForm,
  session: { user: { id: string } },
  contractScanMeta: UploadMeta | null,
  invoiceFileMeta: UploadMeta | null
) {
  const contractScanDocId = await approvalDocId(tx, contractScanMeta, existing.matterId, session.user.id, "CONTRACT", ["Yêu cầu hóa đơn"]);
  const invoiceFileDocId = await approvalDocId(tx, invoiceFileMeta, existing.matterId, session.user.id, "OTHER", ["Hóa đơn điện tử"]);
  // Có hóa đơn điện tử → ISSUED (sửa bug AUTO-67e: trước đây luôn APPROVED)
  const status = invoiceFileMeta ? "ISSUED" : "APPROVED";
  await tx.invoiceRequest.update({
    where: { id: form.requestId },
    data: invoiceRequestApproveData(session, form, status, contractScanDocId, invoiceFileDocId)
  });
  return status;
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

  const form = readApprovalForm(formData);
  const existing = await loadRequestForApproval(form.requestId);

  // File uploads (external, cannot be rolled back) happen first
  const scope = storageScope(existing.matterId, form.requestId);
  const contractScanMeta = form.contractScan ? await prepareUpload(form.contractScan, scope) : null;
  const invoiceFileMeta = form.invoiceFile ? await prepareUpload(form.invoiceFile, scope) : null;

  const finalStatus = await prisma.$transaction((tx) =>
    runApprovalTransaction(tx, existing, form, session, contractScanMeta, invoiceFileMeta)
  );

  await audit({ userId: session.user.id, action: finalStatus === "ISSUED" ? "INVOICE_ISSUED" : "INVOICE_APPROVED", targetType: "InvoiceRequest", targetId: form.requestId, detail: { matterId: existing.matterId, hasContract: !!contractScanMeta, hasInvoice: !!invoiceFileMeta } });
  finishInvoiceFlow(existing.matterId);
  return { ok: true, status: finalStatus };
}

const rejectSchema = z.object({
  requestId: z.string().cuid(),
  reason: z.string().min(1, "Vui lòng nêu lý do từ chối").max(500)
});

async function loadRequestForRejection(requestId: string) {
  const existing = await prisma.invoiceRequest.findUnique({
    where: { id: requestId },
    select: { matterId: true, status: true }
  });
  if (!existing) throw new Error("Yêu cầu không tồn tại");
  if (existing.status === "ISSUED") throw new Error("Yêu cầu đã xuất hóa đơn không thể từ chối");
  return existing;
}

export async function rejectInvoiceRequest(input: z.infer<typeof rejectSchema>) {
  const session = await requireSession();
  requireFinanceOrApprover(session.user.role);
  const data = rejectSchema.parse(input);
  const existing = await loadRequestForRejection(data.requestId);

  await prisma.invoiceRequest.update({
    where: { id: data.requestId },
    data: { status: "REJECTED", processNote: data.reason, processedById: session.user.id, processedAt: new Date() }
  });
  await audit({ userId: session.user.id, action: "INVOICE_REJECTED", targetType: "InvoiceRequest", targetId: data.requestId, detail: { matterId: existing.matterId, reason: data.reason } });
  finishInvoiceFlow(existing.matterId);
  return { ok: true };
}

/** KPI trang tài chính: tổng đã xuất HĐ trong tháng */
export async function getInvoiceStats() {
  const session = await requireSession();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const visibilityWhere = invoiceRequestVisibilityWhere(session.user.id, session.user.role);
  const [issued, pendingCount] = await Promise.all([
    prisma.invoiceRequest.aggregate({
      where: { ...visibilityWhere, status: "ISSUED", processedAt: { gte: monthStart } },
      _sum: { amount: true },
      _count: true
    }),
    prisma.invoiceRequest.count({ where: { ...visibilityWhere, status: "PENDING" } })
  ]);
  return {
    monthlyIssued: Number(issued._sum.amount ?? 0),
    monthlyIssuedCount: issued._count,
    pendingCount
  };
}
