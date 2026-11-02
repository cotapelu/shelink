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
import { assertDocumentWritable } from "@/lib/archive/guard";
import { matterVisibilityFilter, isManager, assertCanAccessMatter, assertCanLeadMatter } from "@/lib/permissions";
import { storage } from "@/lib/storage";
import { validateUploadedFile } from "@/lib/storage/file-validator";
import { encryptBuffer, sha256 } from "@/lib/storage/crypto";

const documentCategorySchema = z.enum([
  "EVIDENCE",
  "PLEADING",
  "PROCEDURE",
  "JUDGMENT",
  "CONTRACT",
  "OTHER"
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Tải lên tài liệu. Frontend truyền FormData qua Server Action, gồm file (File), metadata.
 * Nhánh mã hoá: khi encrypted=true thì mã hoá tệp bằng AES-256-GCM rồi ghi ra đĩa.
 */
export async function uploadDocument(formData: FormData) {
  const session = await requireSession();

  const matterIdRaw = formData.get("matterId");
  const intakeIdRaw = formData.get("intakeId");
  const procedureId = formData.get("procedureId");
  const folderIdRaw = formData.get("folderId");
  const name = formData.get("name");
  const category = formData.get("category");
  const encrypted = formData.get("encrypted") === "true";
  const tagsRaw = formData.get("tags");
  const archiveChecklistItemIdRaw = formData.get("archiveChecklistItemId");
  const sourcePartyRaw = formData.get("sourceParty");
  const file = formData.get("file");

  if (!(file instanceof File)) throw new Error("Thiếu tệp");

  const matterId = typeof matterIdRaw === "string" && matterIdRaw ? matterIdRaw : null;
  const intakeId = typeof intakeIdRaw === "string" && intakeIdRaw ? intakeIdRaw : null;
  if (!matterId && !intakeId) throw new Error("Cần ít nhất một trong hai: matterId hoặc intakeId");

  if (typeof name !== "string" || !name.trim()) throw new Error("Tên tài liệu bắt buộc nhập");
  const parsedCategory = documentCategorySchema.parse(category || "OTHER");
  const tags =
    typeof tagsRaw === "string" && tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

  validateUploadedFile(file, { purpose: "document", maxBytes: MAX_FILE_SIZE });

  const folderId = typeof folderIdRaw === "string" && folderIdRaw ? folderIdRaw : null;

  // Kiểm tra đối tượng sở hữu có tồn tại
  let folderName: string | null = null;
  if (matterId) {
    const matter = await prisma.matter.findUnique({
      where: { id: matterId, deletedAt: null },
      select: { id: true, status: true }
    });
    if (!matter) throw new Error("Vụ án không tồn tại");
    await assertCanAccessMatter(session.user.id, session.user.role, matterId);

    if (folderId) {
      const folder = await prisma.documentFolder.findUnique({
        where: { id: folderId },
        select: { matterId: true, name: true }
      });
      if (!folder || folder.matterId !== matterId) {
        throw new Error("Hồ sơ đích không khớp với vụ án");
      }
      folderName = folder.name;
    }

    // Sau khi lưu trữ chỉ được bổ sung vào hồ sơ ARCHIVE (Kết thúc / Lưu trữ), do guard quyết định
    await assertDocumentWritable(matterId, { kind: "upload", folderName });
  }
  if (intakeId) {
    const intake = await prisma.intake.findUnique({
      where: { id: intakeId },
      select: { id: true, status: true, createdById: true, ownerUserId: true, coUserIds: true }
    });
    if (!intake) throw new Error("Bản ghi tiếp nhận không tồn tại");
    if (intake.status === "DECLINED") throw new Error("Tiếp nhận đã từ chối thì không tải lên tài liệu được");
    const uid = session.user.id;
    if (
      !isManager(session.user.role) &&
      intake.createdById !== uid &&
      intake.ownerUserId !== uid &&
      !intake.coUserIds.includes(uid)
    ) {
      throw new Error("Không có quyền tải tài liệu lên tiếp nhận này");
    }
  }

  const raw = Buffer.from(await file.arrayBuffer());
  const hash = sha256(raw);

  const storageBucket = matterId ? `m_${matterId}` : `i_${intakeId}`;

  let path: string;
  let iv: string | null = null;
  let authTag: string | null = null;
  let algorithm: string | null = null;

  if (encrypted) {
    const enc = encryptBuffer(raw);
    path = await storage.writeFile(storageBucket, enc.ciphertext);
    iv = enc.iv.toString("base64");
    authTag = enc.authTag.toString("base64");
    algorithm = enc.algorithm;
  } else {
    path = await storage.writeFile(storageBucket, raw);
  }

  const archiveChecklistItemId =
    typeof archiveChecklistItemIdRaw === "string" && archiveChecklistItemIdRaw
      ? archiveChecklistItemIdRaw
      : null;

  const created = await prisma.document.create({
    data: {
      matterId,
      intakeId,
      procedureId: typeof procedureId === "string" && procedureId ? procedureId : null,
      folderId,
      name,
      category: parsedCategory,
      sourceParty:
        typeof sourcePartyRaw === "string" && sourcePartyRaw.trim()
          ? sourcePartyRaw.trim()
          : null,
      path,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      sha256: hash,
      encrypted,
      algorithm,
      iv,
      authTag,
      tags,
      archiveChecklistItemId,
      uploadedById: session.user.id
    }
  });

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_UPLOAD",
    targetType: "Document",
    targetId: created.id,
    detail: { matterId, intakeId, name, encrypted, size: file.size }
  });

  // v0.43 mục 4: ghi dòng thời gian động của vụ án (chỉ tài liệu của vụ án)
  if (matterId) {
    await prisma.timelineEvent.create({
      data: {
        matterId,
        eventType: "DOCUMENT_UPLOADED",
        title: `Tải lên tài liệu: ${name.trim()}`,
        occurredAt: new Date(),
        refType: "Document",
        refId: created.id
      }
    });
  }

  if (matterId) revalidatePath(`/matters/${matterId}`);
  if (intakeId) revalidatePath(`/intakes/${intakeId}`);
  return { ok: true, id: created.id };
}

export async function deleteDocument(id: string) {
  const session = await requireSession();
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return { ok: false };

  if (doc.matterId) {
    await assertDocumentWritable(doc.matterId, { kind: "modify" });
    if (doc.uploadedById !== session.user.id) {
      await assertCanLeadMatter(session.user.id, doc.matterId, "Chỉ xoá được tài liệu do mình tải lên, hoặc do chủ trì/cộng tác của vụ án xoá");
    }
  } else if (
    doc.uploadedById !== session.user.id &&
    session.user.role !== "ADMIN" &&
    session.user.role !== "PRINCIPAL_LAWYER"
  ) {
    throw new Error("Chỉ xoá được tài liệu do mình tải lên");
  }

  // Xoá mềm (giữ tệp phục vụ audit), nếu cần xoá vật lý thì dùng script riêng
  await prisma.document.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_DELETE",
    targetType: "Document",
    targetId: id,
    detail: { matterId: doc.matterId, intakeId: doc.intakeId, name: doc.name }
  });

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

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_HARD_DELETE",
    targetType: "Document",
    targetId: id,
    detail: { matterId: doc.matterId, intakeId: doc.intakeId, name: doc.name }
  });

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

export async function listAllDocuments(input: Partial<z.infer<typeof docListQuerySchema>> = {}) {
  const session = await requireSession();
  const query = docListQuerySchema.parse(input);

  const visFilter = matterVisibilityFilter(session.user.id, session.user.role);
  const where: Prisma.DocumentWhereInput = {
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

  return prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: query.limit,
    include: {
      matter: { select: { id: true, internalCode: true, title: true } },
      uploadedBy: { select: { id: true, name: true } }
    }
  });
}

// ============ v0.10: Luồng duyệt văn bản ============

export async function submitDocumentForReview(id: string) {
  const session = await requireSession();
  const doc = await prisma.document.findUnique({ where: { id, deletedAt: null } });
  if (!doc) throw new Error("Tài liệu không tồn tại");
  if (doc.matterId) {
    await assertCanAccessMatter(session.user.id, session.user.role, doc.matterId);
    await assertDocumentWritable(doc.matterId, { kind: "modify" });
  }
  if (doc.status !== "DRAFT") throw new Error("Chỉ tài liệu ở trạng thái nháp mới gửi duyệt được");

  await prisma.document.update({
    where: { id },
    data: { status: "PENDING_REVIEW" },
  });

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_SUBMIT_REVIEW",
    targetType: "Document",
    targetId: id,
    detail: { matterId: doc.matterId, name: doc.name },
  });

  if (doc.matterId) revalidatePath(`/matters/${doc.matterId}`);
  return { ok: true };
}

export async function approveDocument(id: string) {
  const session = await requireSession();
  if (!isManager(session.user.role)) {
    throw new Error("Chỉ quản trị viên hoặc luật sư chủ trì được duyệt văn bản");
  }
  const doc = await prisma.document.findUnique({ where: { id, deletedAt: null } });
  if (!doc) throw new Error("Tài liệu không tồn tại");
  if (doc.status !== "PENDING_REVIEW") throw new Error("Tài liệu không ở trạng thái chờ duyệt");

  await prisma.document.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedById: session.user.id,
      approvedAt: new Date(),
    },
  });

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_APPROVE",
    targetType: "Document",
    targetId: id,
    detail: { matterId: doc.matterId, name: doc.name },
  });

  if (doc.matterId) revalidatePath(`/matters/${doc.matterId}`);
  return { ok: true };
}

export async function rejectDocument(id: string, reason?: string) {
  const session = await requireSession();
  if (!isManager(session.user.role)) {
    throw new Error("Chỉ quản trị viên hoặc luật sư chủ trì được từ chối văn bản");
  }
  const doc = await prisma.document.findUnique({ where: { id, deletedAt: null } });
  if (!doc) throw new Error("Tài liệu không tồn tại");
  if (doc.status !== "PENDING_REVIEW") throw new Error("Tài liệu không ở trạng thái chờ duyệt");

  await prisma.document.update({
    where: { id },
    data: {
      status: "DRAFT",
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
  });

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_REJECT",
    targetType: "Document",
    targetId: id,
    detail: { matterId: doc.matterId, name: doc.name, reason },
  });

  if (doc.matterId) revalidatePath(`/matters/${doc.matterId}`);
  return { ok: true };
}

export async function fileDocument(id: string) {
  const session = await requireSession();
  const doc = await prisma.document.findUnique({ where: { id, deletedAt: null } });
  if (!doc) throw new Error("Tài liệu không tồn tại");
  if (doc.matterId)
    await assertCanAccessMatter(session.user.id, session.user.role, doc.matterId);
  if (doc.status !== "APPROVED") throw new Error("Chỉ tài liệu đã duyệt mới lưu trữ được");

  await prisma.document.update({
    where: { id },
    data: { status: "FILED" },
  });

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_FILE",
    targetType: "Document",
    targetId: id,
    detail: { matterId: doc.matterId, name: doc.name },
  });

  if (doc.matterId) revalidatePath(`/matters/${doc.matterId}`);
  return { ok: true };
}
