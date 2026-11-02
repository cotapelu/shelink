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
 * Upload + xoá tài liệu — tách từ documents/actions.ts (AUTO-67d).
 * uploadDocument 151 dòng/cx39 → parse/validate/write/persist tách riêng.
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertDocumentWritable } from "@/lib/archive/guard";
import { matterVisibilityFilter, isManager, assertCanAccessMatter, assertCanLeadMatter } from "@/lib/permissions";
import { storage } from "@/lib/storage";
import { validateUploadedFile } from "@/lib/storage/file-validator";
import { encryptBuffer, sha256 } from "@/lib/storage/crypto";

export const documentCategorySchema = z.enum([
  "EVIDENCE",
  "PLEADING",
  "PROCEDURE",
  "JUDGMENT",
  "CONTRACT",
  "OTHER"
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

type UploadForm = {
  matterId: string | null;
  intakeId: string | null;
  folderId: string | null;
  name: string;
  category: z.infer<typeof documentCategorySchema>;
  encrypted: boolean;
  tags: string[];
  procedureId: string | null;
  archiveChecklistItemId: string | null;
  sourceParty: string | null;
  file: File;
};

function strOrNull(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value ? value : null;
}

function parseDocumentMeta(formData: FormData) {
  const tagsRaw = formData.get("tags");
  const sourceParty = strOrNull(formData.get("sourceParty"));
  return {
    matterId: strOrNull(formData.get("matterId")),
    intakeId: strOrNull(formData.get("intakeId")),
    folderId: strOrNull(formData.get("folderId")),
    encrypted: formData.get("encrypted") === "true",
    tags:
      typeof tagsRaw === "string" && tagsRaw
        ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
    procedureId: strOrNull(formData.get("procedureId")),
    archiveChecklistItemId: strOrNull(formData.get("archiveChecklistItemId")),
    sourceParty: sourceParty?.trim() || null
  };
}

function parseDocumentCore(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Thiếu tệp");

  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) throw new Error("Tên tài liệu bắt buộc nhập");

  const matterId = strOrNull(formData.get("matterId"));
  const intakeId = strOrNull(formData.get("intakeId"));
  if (!matterId && !intakeId) throw new Error("Cần ít nhất một trong hai: matterId hoặc intakeId");
  return { file, name, matterId, intakeId };
}

function parseDocumentForm(formData: FormData): UploadForm {
  const core = parseDocumentCore(formData);
  return {
    ...core,
    ...parseDocumentMeta(formData),
    category: documentCategorySchema.parse(formData.get("category") || "OTHER")
  };
}

async function resolveFolderName(folderId: string, matterId: string): Promise<string> {
  const folder = await prisma.documentFolder.findUnique({
    where: { id: folderId },
    select: { matterId: true, name: true }
  });
  if (!folder || folder.matterId !== matterId) {
    throw new Error("Hồ sơ đích không khớp với vụ án");
  }
  return folder.name;
}

async function validateMatterOwnership(
  userId: string,
  role: string,
  matterId: string,
  folderId: string | null
): Promise<string | null> {
  const matter = await prisma.matter.findUnique({
    where: { id: matterId, deletedAt: null },
    select: { id: true, status: true }
  });
  if (!matter) throw new Error("Vụ án không tồn tại");
  await assertCanAccessMatter(userId, role, matterId);

  const folderName = folderId ? await resolveFolderName(folderId, matterId) : null;
  // Sau khi lưu trữ chỉ được bổ sung vào hồ sơ ARCHIVE (Kết thúc / Lưu trữ), do guard quyết định
  await assertDocumentWritable(matterId, { kind: "upload", folderName });
  return folderName;
}

async function validateIntakeOwnership(userId: string, role: string, intakeId: string) {
  const intake = await prisma.intake.findUnique({
    where: { id: intakeId },
    select: { id: true, status: true, createdById: true, ownerUserId: true, coUserIds: true }
  });
  if (!intake) throw new Error("Bản ghi tiếp nhận không tồn tại");
  if (intake.status === "DECLINED") throw new Error("Tiếp nhận đã từ chối thì không tải lên tài liệu được");
  if (
    !isManager(role) &&
    intake.createdById !== userId &&
    intake.ownerUserId !== userId &&
    !intake.coUserIds.includes(userId)
  ) {
    throw new Error("Không có quyền tải tài liệu lên tiếp nhận này");
  }
}

async function writePlainFile(file: File, bucket: string) {
  const raw = Buffer.from(await file.arrayBuffer());
  return {
    path: await storage.writeFile(bucket, raw),
    iv: null,
    authTag: null,
    algorithm: null,
    sha256: sha256(raw)
  };
}

async function writeEncryptedFile(file: File, bucket: string) {
  const raw = Buffer.from(await file.arrayBuffer());
  const enc = encryptBuffer(raw);
  return {
    path: await storage.writeFile(bucket, enc.ciphertext),
    iv: enc.iv.toString("base64"),
    authTag: enc.authTag.toString("base64"),
    algorithm: enc.algorithm,
    sha256: sha256(raw)
  };
}

function writeDocumentFile(file: File, bucket: string, encrypted: boolean) {
  return encrypted ? writeEncryptedFile(file, bucket) : writePlainFile(file, bucket);
}

/**
 * Tải lên tài liệu. Frontend truyền FormData qua Server Action, gồm file (File), metadata.
 * Nhánh mã hoá: khi encrypted=true thì mã hoá tệp bằng AES-256-GCM rồi ghi ra đĩa.
 */
function documentCreateData(form: UploadForm, userId: string, stored: Awaited<ReturnType<typeof writeDocumentFile>>) {
  return {
    matterId: form.matterId,
    intakeId: form.intakeId,
    procedureId: form.procedureId,
    folderId: form.folderId,
    name: form.name,
    category: form.category,
    sourceParty: form.sourceParty,
    path: stored.path,
    mimeType: form.file.type || "application/octet-stream",
    size: form.file.size,
    sha256: stored.sha256,
    encrypted: form.encrypted,
    algorithm: stored.algorithm,
    iv: stored.iv,
    authTag: stored.authTag,
    tags: form.tags,
    archiveChecklistItemId: form.archiveChecklistItemId,
    uploadedById: userId
  };
}


async function recordUploadTimeline(matterId: string, name: string, docId: string) {
  await prisma.timelineEvent.create({
    data: {
      matterId,
      eventType: "DOCUMENT_UPLOADED",
      title: `Tải lên tài liệu: ${name.trim()}`,
      occurredAt: new Date(),
      refType: "Document",
      refId: docId
    }
  });
}

async function storeUploadedFile(form: UploadForm) {
  validateUploadedFile(form.file, { purpose: "document", maxBytes: MAX_FILE_SIZE });
  const bucket = form.matterId ? `m_${form.matterId}` : `i_${form.intakeId}`;
  return writeDocumentFile(form.file, bucket, form.encrypted);
}

async function auditUpload(session: { user: { id: string } }, form: UploadForm, docId: string) {
  await audit({
    userId: session.user.id,
    action: "DOCUMENT_UPLOAD",
    targetType: "Document",
    targetId: docId,
    detail: { matterId: form.matterId, intakeId: form.intakeId, name: form.name, encrypted: form.encrypted, size: form.file.size }
  });
}

export async function uploadDocument(formData: FormData) {
  const session = await requireSession();
  const form = parseDocumentForm(formData);

  if (form.matterId) await validateMatterOwnership(session.user.id, session.user.role, form.matterId, form.folderId);
  if (form.intakeId) await validateIntakeOwnership(session.user.id, session.user.role, form.intakeId);

  const stored = await storeUploadedFile(form);
  const created = await prisma.document.create({ data: documentCreateData(form, session.user.id, stored) });

  await auditUpload(session, form, created.id);
  if (form.matterId) await recordUploadTimeline(form.matterId, form.name, created.id);
  if (form.matterId) revalidatePath(`/matters/${form.matterId}`);
  if (form.intakeId) revalidatePath(`/intakes/${form.intakeId}`);
  return { ok: true, id: created.id };
}

async function assertDocumentDeletable(userId: string, role: string, doc: {
  id: string;
  matterId: string | null;
  intakeId: string | null;
  uploadedById: string | null;
  path: string;
  name: string;
}) {
  if (doc.matterId) {
    await assertDocumentWritable(doc.matterId, { kind: "modify" });
    if (doc.uploadedById !== userId) {
      await assertCanLeadMatter(userId, doc.matterId, "Chỉ xoá được tài liệu do mình tải lên, hoặc do chủ trì/cộng tác của vụ án xoá");
    }
    return;
  }
  if (doc.uploadedById !== userId && role !== "ADMIN" && role !== "PRINCIPAL_LAWYER") {
    throw new Error("Chỉ xoá được tài liệu do mình tải lên");
  }
}

function documentAuditDetail(doc: { matterId: string | null; intakeId: string | null; name: string }) {
  return { matterId: doc.matterId, intakeId: doc.intakeId, name: doc.name };
}

export async function deleteDocument(id: string) {
  const session = await requireSession();
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return { ok: false };

  await assertDocumentDeletable(session.user.id, session.user.role, doc);

  // Xoá mềm (giữ tệp phục vụ audit), nếu cần xoá vật lý thì dùng script riêng
  await prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ userId: session.user.id, action: "DOCUMENT_DELETE", targetType: "Document", targetId: id, detail: documentAuditDetail(doc) });

  if (doc.matterId) revalidatePath(`/matters/${doc.matterId}`);
  if (doc.intakeId) revalidatePath(`/intakes/${doc.intakeId}`);
  return { ok: true };
}

export async function hardDeleteDocument(id: string) {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("Chỉ ADMIN mới xoá hẳn tài liệu");
  }
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return { ok: false };
  await assertDocumentWritable(doc.matterId, { kind: "modify" });

  await storage.deleteFile(doc.path);
  await prisma.document.delete({ where: { id } });
  await audit({ userId: session.user.id, action: "DOCUMENT_HARD_DELETE", targetType: "Document", targetId: id, detail: documentAuditDetail(doc) });

  if (doc.matterId) revalidatePath(`/matters/${doc.matterId}`);
  if (doc.intakeId) revalidatePath(`/intakes/${doc.intakeId}`);
  return { ok: true };
}

const docListQuerySchema = z.object({
  search: z.string().optional(),
  category: documentCategorySchema.optional(),
  matterId: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200)
});

function docListWhere(query: z.infer<typeof docListQuerySchema>, userId: string, role: string): Prisma.DocumentWhereInput {
  const visFilter = matterVisibilityFilter(userId, role);
  return {
    deletedAt: null,
    matter: { deletedAt: null, ...visFilter },
    ...(query.category ? { category: query.category } : {}),
    ...(query.matterId ? { matterId: query.matterId } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { tags: { has: query.search } }
          ]
        }
      : {})
  };
}

export async function listAllDocuments(input: Partial<z.infer<typeof docListQuerySchema>> = {}) {
  const session = await requireSession();
  const query = docListQuerySchema.parse(input);

  return prisma.document.findMany({
    where: docListWhere(query, session.user.id, session.user.role),
    orderBy: { createdAt: "desc" },
    take: query.limit,
    include: {
      matter: { select: { id: true, internalCode: true, title: true } },
      uploadedBy: { select: { id: true, name: true } }
    }
  });
}
