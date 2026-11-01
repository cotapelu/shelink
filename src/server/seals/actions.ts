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
import { Prisma, type SealType, type UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { createNotification } from "@/server/notifications/create";
import { notifyDirectApprovers } from "@/server/notifications/approval";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanAssociateMatter } from "@/lib/permissions";
import { storage } from "@/lib/storage";
import { validateUploadedFile } from "@/lib/storage/file-validator";
import { decryptBuffer, encryptBuffer, sha256 } from "@/lib/storage/crypto";
import { normalizeUploadedFilename } from "@/lib/filename";
import {
  sealCreateSchema,
  sealApproveSchema,
  sealRejectSchema,
  sealCancelSchema,
  sealListFilterSchema
} from "./schemas";
import {
  LEGAL_REP_EXTRA_TAGS,
  STAMP_DOC_TAGS,
  buildSealFormRaw,
  deriveAlsoLegalRep,
  toLegalRepSealRequestData,
  toSealDocumentData,
  toSealRequestData,
  type DocPrepare
} from "./seal-create-lib";
import {
  buildSealListWhere,
  canCancelSeal,
  canStampSeal,
  monthStampedScope,
  sealApprovalContent
} from "./seal-flow-lib";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const FIRM_LEGAL_REP_KEY = "firmLegalRepUserId";

function assertPdfDocument(file: { name?: string | null; type?: string | null; mimeType?: string | null }) {
  const type = file.type ?? file.mimeType ?? "";
  const name = file.name ?? "";
  if (type !== "application/pdf" && !name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Can tai len tep dinh dang PDF");
  }
}

// ============================================================
// Ma thu tu SEAL-YYYY-NNNN
// ============================================================
async function generateSealCode(): Promise<string> {
  const year = new Date().getFullYear();
  const key = `seal-counter-${year}`;
  const next = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.systemSetting.findUnique({ where: { key } });
      const current = (existing?.value as { value?: number })?.value ?? 0;
      const incremented = current + 1;
      await tx.systemSetting.upsert({
        where: { key },
        update: { value: { value: incremented } },
        create: { key, value: { value: incremented } }
      });
      return incremented;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
  return `SEAL-${year}-${String(next).padStart(4, "0")}`;
}

// ============================================================
// Phan quyen - ai duoc duyet sealType nao
// ============================================================
async function getFirmLegalRepUserId(): Promise<string | null> {
  const s = await prisma.systemSetting.findUnique({ where: { key: FIRM_LEGAL_REP_KEY } });
  const v = (s?.value as { value?: string })?.value;
  return typeof v === "string" && v.length > 0 ? v : null;
}

async function canApproveSealType(
  sealType: SealType,
  user: { id: string; role: string }
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const cfg = await prisma.sealTypeConfig.findUnique({ where: { type: sealType } });
  if (!cfg || !cfg.enabled) return false;
  if (cfg.requiresLegalRep) {
    const repId = await getFirmLegalRepUserId();
    return !!repId && repId === user.id;
  }
  return cfg.approverRoles.includes(user.role as UserRole);
}

// ============================================================
// Danh sach
// ============================================================
/**
 * List seal requests with optional filters (status, type, matterId, date range).
 * @param input - Optional filter criteria from sealListFilterSchema.
 * @returns Promise<Array<SealRequest>> - List of seal requests with matter and owner details.
 * @throws {ZodError} If validation fails.
 * @access Requires authenticated session; respects matter association filter.
 * @audit Logs seal request access.
 */
export async function listSealRequests(input?: z.input<typeof sealListFilterSchema>) {
  const session = await requireSession();
  const filter = sealListFilterSchema.parse(input ?? {});
  // Cho toi duyet: ghep sealTypes co the duyet duoc dua tren vai tro nguoi dung
  const approvableTypes =
    filter.scope === "approval" ? await pickApprovableSealTypes(session.user) : [];
  if (filter.scope === "approval" && approvableTypes.length === 0) {
    return [];
  }

  const where = buildSealListWhere(filter, session.user, approvableTypes) as Prisma.SealRequestWhereInput;
  return prisma.sealRequest.findMany({
    where,
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
    include: SEAL_LIST_INCLUDE
  });
}

/** Include chuẩn cho danh sách seal (trích để action ≤20 dòng). */
const SEAL_LIST_INCLUDE = {
  matter: { select: { id: true, internalCode: true, title: true } },
  requestedBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  stampedByUser: { select: { id: true, name: true } },
  draftDoc: { select: { id: true, name: true, size: true } },
  stampedDoc: { select: { id: true, name: true, size: true } }
} as const;

async function pickApprovableSealTypes(user: { id: string; role: string }): Promise<SealType[]> {
  if (user.role === "ADMIN") {
    return ["OFFICIAL_SEAL", "CONTRACT_SEAL", "FINANCE_SEAL", "LEGAL_REP_SEAL", "CONTRACT_REVIEW_SEAL"];
  }
  const cfgs = await prisma.sealTypeConfig.findMany({ where: { enabled: true } });
  const repId = await getFirmLegalRepUserId();
  return cfgs
    .filter((c) => {
      if (c.requiresLegalRep) return !!repId && repId === user.id;
      return c.approverRoles.includes(user.role as UserRole);
    })
    .map((c) => c.type);
}

/** ID người nhận thông báo theo cấu hình loại dấu (đại diện pháp luật hoặc vai trò duyệt). */
async function configRecipientIds(cfg: {
  enabled: boolean;
  requiresLegalRep: boolean;
  approverRoles: string[];
}): Promise<string[]> {
  if (cfg.requiresLegalRep) {
    const repId = await getFirmLegalRepUserId();
    return repId ? [repId] : [];
  }
  if (cfg.approverRoles.length === 0) return [];
  const roleApprovers = await prisma.user.findMany({
    where: { active: true, role: { in: cfg.approverRoles as UserRole[] } },
    select: { id: true }
  });
  return roleApprovers.map((user) => user.id);
}

async function getSealApprovalRecipientIds(sealType: SealType): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { active: true, role: "ADMIN" },
    select: { id: true }
  });
  const ids = admins.map((user) => user.id);

  const cfg = await prisma.sealTypeConfig.findUnique({ where: { type: sealType } });
  if (!cfg || !cfg.enabled) return ids;
  ids.push(...(await configRecipientIds(cfg)));
  return ids;
}

async function notifySealApprovalRequested(input: {
  sealRequestId: string;
  code: string;
  sealType: SealType;
  documentTitle: string;
  purpose: string;
  requesterId: string;
  requesterName?: string | null;
  urgency: "NORMAL" | "URGENT";
}) {
  const userIds = await getSealApprovalRecipientIds(input.sealType);
  await notifyDirectApprovers({
    userIds,
    excludeUserId: input.requesterId,
    title: "Co yeu cau phê duyệt dong dau moi can xu ly",
    content: sealApprovalContent(input),
    href: `/approvals/seals?id=${input.sealRequestId}`, refType: "SealRequest", refId: input.sealRequestId,
    priority: input.urgency === "URGENT" ? "URGENT" : "HIGH"
  });
}

export async function getSealApprovalCapabilities() {
  const session = await requireSession();
  const approvableTypes = await pickApprovableSealTypes(session.user);
  return {
    canApprove: approvableTypes.length > 0,
    canViewFirmQueue:
      session.user.role === "ADMIN" ||
      session.user.role === "PRINCIPAL_LAWYER" ||
      session.user.role === "FINANCE"
  };
}

/**
 * Retrieve a single seal request by ID.
 * @param id - Seal request ID (cuid).
 * @returns Promise<SealRequest> with full details including file info, approvals.
 * @throws {Error} If seal not found or user lacks permission.
 * @access Requires authenticated session; checks matter association.
 * @audit Logs seal request view.
 */
export async function getSealRequest(id: string) {
  await requireSession();
  return prisma.sealRequest.findUnique({
    where: { id },
    include: {
      matter: { select: { id: true, internalCode: true, title: true } },
      requestedBy: { select: { id: true, name: true, role: true } },
      approvedBy: { select: { id: true, name: true } },
      stampedByUser: { select: { id: true, name: true } },
      draftDoc: { select: { id: true, name: true, size: true, mimeType: true } },
      stampedDoc: { select: { id: true, name: true, size: true, mimeType: true } },
      parentSealRequest: { select: { id: true, code: true, status: true } }
    }
  });
}

export async function listSealTypeConfigs() {
  await requireSession();
  return prisma.sealTypeConfig.findMany({ orderBy: { type: "asc" } });
}

/** Đếm yêu cầu chờ duyệt theo loại dấu được phép (0 nếu không có loại nào). */
async function countPendingApproval(approvableTypes: SealType[]): Promise<number> {
  if (approvableTypes.length === 0) return 0;
  return prisma.sealRequest.count({ where: { status: "PENDING", sealType: { in: approvableTypes } } });
}

export async function getSealStats() {
  const session = await requireSession();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const scope = monthStampedScope(session.user.role, monthStart) as Prisma.SealRequestWhereInput;
  const approvableTypes = await pickApprovableSealTypes(session.user);

  const [monthStamped, pendingApprovalCount, waitingStampCount] = await Promise.all([
    prisma.sealRequest.count({ where: scope }),
    countPendingApproval(approvableTypes),
    prisma.sealRequest.count({ where: { status: "APPROVED" } })
  ]);

  return { monthStamped, pendingApprovalCount, waitingStampCount };
}

// ============================================================
// Tao yeu cau moi - FormData (kem tep draftDoc)
// ============================================================
/**
 * Create a new seal request (upload PDF, generate seal code).
 * @param formData - Multipart form data containing seal file and metadata.
 * @returns Promise<SealRequest> - Created seal request.
 * @throws {Error} If validation fails, file invalid, or matter not writable.
 * @access Requires authenticated session; user must be matter member.
 * @audit Logs seal request creation.
 */
// ── io helpers cho createSealRequest (tách AUTO-65; payload thuần ở seal-create-lib) ──

/** Kiểm tra quyền liên kết + tồn tại của vụ (nếu có matterId). */
async function assertSealMatterLink(userId: string, matterId: string | null | undefined): Promise<void> {
  if (!matterId) return;
  await assertCanAssociateMatter(userId, matterId);
  await assertMatterWritable(matterId);
  const m = await prisma.matter.findUnique({ where: { id: matterId }, select: { id: true } });
  if (!m) throw new Error("Vụ án lien ket khong ton tai");
}

/** Mã hóa buffer + ghi bản sao độc lập → phần enc của DocPrepare. */
async function writeEncryptedSealCopy(plainBuf: Buffer, matterId: string | null | undefined) {
  const enc = encryptBuffer(plainBuf);
  const path = await storage.writeFile(matterId ? `m_${matterId}` : "seals", enc.ciphertext);
  return { path, algorithm: enc.algorithm, iv: enc.iv.toString("base64"), authTag: enc.authTag.toString("base64") };
}

/** Bản nháp từ văn bản hiện có: đọc → giải mã (nếu có) → mã hóa lại → ghi bản sao. */
async function prepareDraftFromExisting(existingDraftDocId: string, matterId: string | null | undefined) {
  const src = await prisma.document.findUnique({ where: { id: existingDraftDocId } });
  if (!src) throw new Error("Van ban cho dong dau khong ton tai");
  assertPdfDocument(src);
  const srcCt = await storage.readFile(src.path);
  const plainBuf = src.encrypted && src.iv && src.authTag ? decryptBuffer(srcCt, src.iv, src.authTag) : srcCt;
  const enc = await writeEncryptedSealCopy(plainBuf, matterId);
  return {
    prepare: {
      name: src.name,
      mimeType: src.mimeType ?? "application/octet-stream",
      size: src.size ?? plainBuf.length,
      sha: sha256(plainBuf),
      ...enc
    } satisfies DocPrepare,
    plainBuf
  };
}

/** Bản nháp từ file upload: validate → đọc → mã hóa → ghi. */
async function prepareDraftFromUpload(file: File, matterId: string | null | undefined) {
  assertPdfDocument(file);
  validateUploadedFile(file, { purpose: "seal", maxBytes: MAX_FILE_SIZE });
  const plainBuf = Buffer.from(await file.arrayBuffer());
  const enc = await writeEncryptedSealCopy(plainBuf, matterId);
  return {
    prepare: {
      name: normalizeUploadedFilename(file.name),
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      sha: sha256(plainBuf),
      ...enc
    } satisfies DocPrepare,
    plainBuf
  };
}

/** Chọn nguồn bản nháp: văn bản hiện có → file upload → throw nếu không có. */
async function resolveSealDraft(formData: FormData, matterId: string | null | undefined) {
  const existingDraftDocId = formData.get("existingDraftDocId");
  if (typeof existingDraftDocId === "string" && existingDraftDocId) {
    return prepareDraftFromExisting(existingDraftDocId, matterId);
  }
  const draftFile = formData.get("draftDoc");
  if (draftFile instanceof File && draftFile.size > 0) {
    return prepareDraftFromUpload(draftFile, matterId);
  }
  throw new Error("Vui long tai len ban nhap cho dong dau");
}

/** Revalidate các trang bị ảnh hưởng sau khi tạo yêu cầu đóng dấu. */
function revalidateSealPaths(matterId: string | null | undefined): void {
  revalidatePath("/approvals/seals");
  if (matterId) revalidatePath(`/matters/${matterId}`);
}

// ── helper dùng chung cho các quyết định (duyệt/từ chối/rút/điền) ──

/** Load seal + kiểm tra tồn tại + đúng trạng thái chờ xử lý. */
async function loadSealForDecision(
  id: string,
  expectedStatus: string,
  notFoundMessage: string,
  wrongStatusMessage: string
) {
  const seal = await prisma.sealRequest.findUnique({
    where: { id },
    select: { id: true, status: true, sealType: true, matterId: true, requestedById: true }
  });
  if (!seal) throw new Error(notFoundMessage);
  if (seal.status !== expectedStatus) throw new Error(wrongStatusMessage);
  return seal;
}

/** Kiểm tra quyền theo loại dấu (throw nếu không đủ quyền). */
async function assertSealApprover(
  sealType: SealType,
  user: { id: string; role: string },
  message: string
): Promise<void> {
  const ok = await canApproveSealType(sealType, user);
  if (!ok) throw new Error(message);
}

/** Audit một hành động trên seal. */
async function auditSealAction(
  userId: string,
  action: string,
  sealId: string,
  detail?: Record<string, unknown>
): Promise<void> {
  await audit({ userId, action, targetType: "SealRequest", targetId: sealId, ...(detail ? { detail } : {}) });
}

/** Thông báo đổi trạng thái cho người yêu cầu. */
async function notifySealStatusChange(args: {
  userId: string;
  title: string;
  content: string;
  sealId: string;
}): Promise<void> {
  await createNotification({
    userId: args.userId,
    type: "SEAL_STATUS_CHANGE",
    title: args.title,
    content: args.content,
    href: "/approvals/seals",
    refType: "SealRequest",
    refId: args.sealId
  });
}

type SealCreateTxData = z.infer<typeof sealCreateSchema>;

/** Bản sao + code cho yêu cầu con LEGAL_REP (draftDocId unique). */
async function prepareLegalRepIfNeeded(
  alsoLegalRep: boolean,
  draft: { prepare: DocPrepare; plainBuf: Buffer },
  matterId: string | null | undefined
): Promise<{ prepare: DocPrepare; code: string } | null> {
  if (!alsoLegalRep) return null;
  const code = await generateSealCode();
  const enc = await writeEncryptedSealCopy(draft.plainBuf, matterId);
  return { prepare: { ...draft.prepare, ...enc }, code };
}

/** Tạo cặp (document + sealRequest) cho yêu cầu con đại diện pháp luật; trả id seal. */
async function createLegalRepSealPair(tx: Prisma.TransactionClient, args: {
  prepare: DocPrepare;
  code: string;
  data: SealCreateTxData;
  userId: string;
  matterId: string | null | undefined;
  parentSealId: string;
  parentCode: string;
}): Promise<string> {
  const doc = await tx.document.create({
    data: toSealDocumentData(args.prepare, { uploadedById: args.userId, matterId: args.matterId, extraTags: LEGAL_REP_EXTRA_TAGS })
  });
  const seal = await tx.sealRequest.create({
    data: toLegalRepSealRequestData(args.data, { draftDocId: doc.id, requestedById: args.userId, code: args.code, parentSealId: args.parentSealId, parentCode: args.parentCode })
  });
  return seal.id;
}

/** Thân transaction: bản nháp → seal chính → (tuỳ chọn) cặp LEGAL_REP. */
async function runSealCreateTx(tx: Prisma.TransactionClient, args: {
  data: SealCreateTxData;
  code: string;
  userId: string;
  matterId: string | null | undefined;
  draftPrepare: DocPrepare;
  legalRep: { prepare: DocPrepare; code: string } | null;
}): Promise<{ sealId: string; legalRepSealId: string | null }> {
  const draftDoc = await tx.document.create({
    data: toSealDocumentData(args.draftPrepare, { uploadedById: args.userId, matterId: args.matterId })
  });
  const seal = await tx.sealRequest.create({
    data: toSealRequestData(args.data, { draftDocId: draftDoc.id, requestedById: args.userId, code: args.code })
  });
  const legalRepSealId = args.legalRep
    ? await createLegalRepSealPair(tx, { prepare: args.legalRep.prepare, code: args.legalRep.code, data: args.data, userId: args.userId, matterId: args.matterId, parentSealId: seal.id, parentCode: args.code })
    : null;
  return { sealId: seal.id, legalRepSealId };
}

/** Audit cả yêu cầu chính và yêu cầu con (nếu có). */
async function auditSealCreated(userId: string, data: SealCreateTxData, ctx: {
  sealId: string;
  code: string;
  legalRepCode: string | null;
  legalRepSealId: string | null;
}): Promise<void> {
  const entry = (targetId: string, code: string, detail: Record<string, unknown>) =>
    audit({ userId, action: "SEAL_REQUEST_CREATE", targetType: "SealRequest", targetId, detail });
  await entry(ctx.sealId, ctx.code, { code: ctx.code, sealType: data.sealType, matterId: data.matterId, alsoLegalRep: !!ctx.legalRepSealId });
  if (ctx.legalRepSealId && ctx.legalRepCode) {
    await entry(ctx.legalRepSealId, ctx.legalRepCode, { code: ctx.legalRepCode, sealType: "LEGAL_REP_SEAL", matterId: data.matterId, parentCode: ctx.code });
  }
}

/** Thông báo duyệt cho cả yêu cầu chính và yêu cầu con (nếu có). */
async function notifySealPairRequested(args: {
  user: { id: string; name?: string | null };
  data: SealCreateTxData;
  code: string;
  sealId: string;
  legalRepCode: string | null;
  legalRepSealId: string | null;
}): Promise<void> {
  const base = {
    sealRequestId: args.sealId, code: args.code, sealType: args.data.sealType,
    documentTitle: args.data.documentTitle.trim(), purpose: args.data.purpose.trim(),
    requesterId: args.user.id, requesterName: args.user.name ?? null, urgency: args.data.urgency
  };
  await notifySealApprovalRequested(base);
  if (args.legalRepSealId && args.legalRepCode) {
    await notifySealApprovalRequested({ ...base, sealRequestId: args.legalRepSealId, code: args.legalRepCode, sealType: "LEGAL_REP_SEAL", purpose: `${args.data.purpose.trim()} (dong thoi voi ${args.code})` });
  }
}

/**
 * Tạo yêu cầu đóng dấu (AUTO-65 refactor: parse/assert/prepare/tx đã tách;
 * payload map nằm ở seal-create-lib — đã test).
 * "Đồng thời đóng dấu đại diện pháp luật": khi yêu cầu chính không phải LEGAL_REP_SEAL
 * và form bật cờ alsoLegalRep → sinh thêm yêu cầu con dùng chung 1 bản sao văn bản.
 */
export async function createSealRequest(formData: FormData) {
  const session = await requireSession();
  if (!["ADMIN", "PRINCIPAL_LAWYER", "LAWYER"].includes(session.user.role)) throw new Error("Chi luat su, chu nhiem, quan tri moi duoc xin dong dau");
  const data = sealCreateSchema.parse(buildSealFormRaw(formData));
  const alsoLegalRep = deriveAlsoLegalRep(formData, data.sealType);

  await assertSealMatterLink(session.user.id, data.matterId);
  const draft = await resolveSealDraft(formData, data.matterId);

  // Code sinh TRƯỚC giao dịch (tránh transaction lồng nhau khi gọi generateSealCode)
  const code = await generateSealCode();
  const legalRep = await prepareLegalRepIfNeeded(alsoLegalRep, draft, data.matterId);
  const created = await prisma.$transaction((tx) => runSealCreateTx(tx, { data, code, userId: session.user.id, matterId: data.matterId, draftPrepare: draft.prepare, legalRep }));
  const ctx = { sealId: created.sealId, code, legalRepCode: legalRep?.code ?? null, legalRepSealId: created.legalRepSealId };

  await auditSealCreated(session.user.id, data, ctx);
  await notifySealPairRequested({ user: session.user, data, ...ctx });
  revalidateSealPaths(data.matterId);
  return { ok: true, id: created.sealId, code };
}
// ============================================================
// Duyyet qua
// ============================================================
/**
 * Approve a seal request (by authorized approvers).
 * @param input - { sealRequestId, comment? }.
 * @returns Promise<SealRequest> - Updated seal request with status APPROVED.
 * @throws {Error} If not authorized, seal not found, or validation fails.
 * @access Requires session; only users with approve permission can perform.
 * @audit Logs approval action and notifies requestor.
 */
export async function approveSealRequest(input: z.infer<typeof sealApproveSchema>) {
  const session = await requireSession();
  const data = sealApproveSchema.parse(input);

  const seal = await loadSealForDecision(data.id, "PENDING", "Yeu cau khong ton tai", "Yeu cau nay da duoc xu ly");
  await assertSealApprover(seal.sealType, session.user, "Khong co quyen duyet loai dong dau nay");

  await prisma.sealRequest.update({
    where: { id: data.id },
    data: { status: "APPROVED", approveNote: (data.note || "").trim() || null, approvedById: session.user.id, approvedAt: new Date() }
  });

  await auditSealAction(session.user.id, "SEAL_APPROVED", data.id, { sealType: seal.sealType });
  await notifySealStatusChange({ userId: seal.requestedById, title: "Yeu cau dong dau da duoc duyet", content: `Yeu cau dong dau cua ban (${seal.sealType}) da duoc phe duyet qua`, sealId: data.id });

  revalidateSealPaths(seal.matterId);
  return { ok: true };
}

// ============================================================
// Tu choi
// ============================================================
/**
 * Reject a seal request with a reason.
 * @param input - { sealRequestId, reason }.
 * @returns Promise<SealRequest> - Updated seal request with status REJECTED.
 * @throws {Error} If not authorized, seal not found, or reason missing.
 * @access Requires session; only authorized approvers can reject.
 * @audit Logs rejection and notifies requestor.
 */
export async function rejectSealRequest(input: z.infer<typeof sealRejectSchema>) {
  const session = await requireSession();
  const data = sealRejectSchema.parse(input);

  const seal = await loadSealForDecision(data.id, "PENDING", "Yeu cau khong ton tai", "Yeu cau nay da duoc xu ly");
  await assertSealApprover(seal.sealType, session.user, "Khong co quyen tu choi loai dong dau nay");

  await prisma.sealRequest.update({
    where: { id: data.id },
    data: { status: "REJECTED", approveNote: data.reason, approvedById: session.user.id, approvedAt: new Date(), rejectedAt: new Date() }
  });

  await auditSealAction(session.user.id, "SEAL_REJECTED", data.id, { reason: data.reason });
  await notifySealStatusChange({ userId: seal.requestedById, title: "Yeu cau dong dau da bi tu choi", content: `Yeu cau dong dau cua ban (${seal.sealType}) da bi tu choi, ly do: ${data.reason}`, sealId: data.id });

  revalidateSealPaths(seal.matterId);
  return { ok: true };
}

// ============================================================
// Dien lai ban dong dau (FormData: stampedDoc bat buoc)
// ============================================================
/** Validate + mã hóa + ghi bản scan sau khi đóng dấu → DocPrepare. */
async function writeStampedDoc(file: File, matterId: string | null | undefined) {
  assertPdfDocument(file);
  validateUploadedFile(file, { purpose: "stamp", maxBytes: MAX_FILE_SIZE });
  const buf = Buffer.from(await file.arrayBuffer());
  const enc = encryptBuffer(buf);
  const path = await storage.writeFile(matterId ? `m_${matterId}` : "seals", enc.ciphertext);
  return {
    prepare: {
      name: normalizeUploadedFilename(file.name),
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      sha: sha256(buf),
      path,
      algorithm: enc.algorithm,
      iv: enc.iv.toString("base64"),
      authTag: enc.authTag.toString("base64")
    } satisfies DocPrepare,
    buf
  };
}

/** Thân transaction điền dấu: tạo document bản scan → cập nhật seal STAMPED. */
async function runStampTx(
  tx: Prisma.TransactionClient,
  id: string,
  prepare: DocPrepare,
  matterId: string | null | undefined,
  userId: string
): Promise<void> {
  const stampedDoc = await tx.document.create({
    data: toSealDocumentData(prepare, { uploadedById: userId, matterId, baseTags: STAMP_DOC_TAGS })
  });
  await tx.sealRequest.update({
    where: { id },
    data: { status: "STAMPED", stampedDocId: stampedDoc.id, stampedById: userId, stampedAt: new Date() }
  });
}

export async function stampSealRequest(formData: FormData) {
  const session = await requireSession();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) throw new Error("thieu id");

  const seal = await loadSealForDecision(id, "APPROVED", "Yeu cau khong ton tai", "Chi yeu cau da duyet moi dien lai duoc ban dong dau");
  // Phan quyen: nguoi yeu cau dien lai duoc; nguoi duyet / ADMIN dien lai duoc
  const okApprover = await canApproveSealType(seal.sealType, session.user);
  if (!canStampSeal(seal, session.user, okApprover)) throw new Error("Khong co quyen dien lai ban dong dau");

  const stampedFile = formData.get("stampedDoc");
  if (!(stampedFile instanceof File) || stampedFile.size === 0) throw new Error("Vui long tai len ban scan sau khi dong dau");

  const { prepare } = await writeStampedDoc(stampedFile, seal.matterId);
  await prisma.$transaction((tx) => runStampTx(tx, id, prepare, seal.matterId, session.user.id));

  await auditSealAction(session.user.id, "SEAL_STAMPED", id, { sealType: seal.sealType });
  revalidateSealPaths(seal.matterId);
  return { ok: true };
}

// ============================================================
// Rut lai (chi khi chua duyet + chi nguoi yeu cau/quan tri)
// ============================================================
/**
 * Cancel a seal request (by requestor or admin) before finalization.
 * @param input - { sealRequestId }.
 * @returns Promise<SealRequest> - Updated seal request with status CANCELLED.
 * @throws {Error} If not authorized, seal not found, or seal already processed.
 * @access Requires session; only requestor or admin can cancel.
 * @audit Logs cancellation.
 */
export async function cancelSealRequest(input: z.infer<typeof sealCancelSchema>) {
  const session = await requireSession();
  const data = sealCancelSchema.parse(input);

  const seal = await loadSealForDecision(data.id, "PENDING", "Yeu cau khong ton tai", "Chi yeu cau chua duyet moi rut lai duoc");
  if (!canCancelSeal(seal.requestedById, session.user)) {
    throw new Error("Chi nguoi yeu cau hoac quan tri moi rut lai duoc");
  }

  await prisma.sealRequest.update({ where: { id: data.id }, data: { status: "CANCELLED" } });
  await auditSealAction(session.user.id, "SEAL_CANCELLED", data.id);

  revalidateSealPaths(seal.matterId);
  return { ok: true };
}
