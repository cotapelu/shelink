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
 * v0.9.4 Render riêng cho lưu trữ: Bìa hồ sơ + Mục lục hồ sơ
 *
 * Tái sử dụng pipeline docxtemplater, nhưng so với renderTemplate chung có thêm hai việc:
 *   1. Chèn ngữ cảnh archive.* (mã lưu trữ, hình thức kết thúc, ngày lưu trữ...)
 *   2. Mục lục hồ sơ chèn thêm mảng documents[] để lặp dòng
 *
 * Sản phẩm render rơi vào hồ sơ ARCHIVE/Kết thúc/Lưu trữ, category=PROCEDURE, gắn ID mẫu (phục vụ audit).
 * LƯU Ý: nameMap + toCNDate giữ nguyên — mẫu nguồn là văn bản pháp lý tiếng Trung (cụm template-builder, chờ duyệt dịch).
 */
import { Prisma, type PrismaClient, type MatterCategory } from "@prisma/client";
import { storage } from "@/lib/storage";
import { decryptBuffer, encryptBuffer, sha256 } from "@/lib/storage/crypto";
import { buildContext, renderDocxBuffer, type RenderContext } from "@/lib/template-engine";
import { suggestFolderByTemplateCategory } from "@/lib/default-folders";
import { CLOSED_REASON_CN } from "./schemas";
import type { ArchiveClosedReason } from "@prisma/client";

const CATEGORY_CN_DOC: Record<string, string> = {
  EVIDENCE: "Tài liệu chứng cứ",
  PLEADING: "Văn bản tố tụng",
  PROCEDURE: "Tài liệu thủ tục",
  JUDGMENT: "Văn bản quyết định",
  CONTRACT: "Hợp đồng",
  OTHER: "Khác"
};

// Ngày dạng chữ số Hán cho mẫu văn bản pháp lý — CỤM CHỜ DUYỆT DỊCH (cùng template-builder.ts,
// xem docs/I18N-GLOSSARY.md): mẫu nguồn 卷宗封皮/卷宗目录 là văn bản pháp lý tiếng Trung seed sẵn trong DB.
function toCNDate(d: Date): string {
  const cnDigits = "〇一二三四五六七八九";
  const y = String(d.getFullYear()).split("").map((c) => cnDigits[+c]).join("");
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const cnNum = (n: number) => {
    if (n <= 10) return ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"][n];
    if (n < 20) return "十" + cnDigits[n - 10];
    if (n < 30) return "二十" + (n === 20 ? "" : cnDigits[n - 20]);
    return "三十" + (n === 30 ? "" : cnDigits[n - 30]);
  };
  return `${y}年${cnNum(m)}月${cnNum(day)}日`;
}

interface ArchiveExtras {
  archiveNo: string;
  closedReason: ArchiveClosedReason;
  completedAt: Date;
  archivedAt: Date;
  judgmentSummary?: string;
}

async function loadBuiltinTemplate(prisma: PrismaClient, key: "archive_cover" | "archive_catalog") {
  // Tìm mẫu built-in theo name (key không lưu DB, name do BUILTIN_TEMPLATES quyết định)
  const nameMap: Record<string, string> = {
    archive_cover: "卷宗封皮",
    archive_catalog: "卷宗目录"
  };
  const tmpl = await prisma.documentTemplate.findFirst({
    where: { name: nameMap[key], isBuiltIn: true, enabled: true },
    include: { docxBlob: true }
  });
  if (!tmpl || !tmpl.docxBlob) {
    throw new Error(`Thiếu mẫu built-in ${nameMap[key]}, hãy chạy npx prisma db seed`);
  }
  const raw = await storage.readFile(tmpl.docxBlob.path);
  const buffer = tmpl.docxBlob.encrypted
    ? decryptBuffer(raw, tmpl.docxBlob.iv ?? "", tmpl.docxBlob.authTag ?? "")
    : raw;
  return { tmpl, templateBuffer: buffer };
}

async function findOrCreateArchiveFolder(
  prisma: Pick<PrismaClient, "documentFolder">,
  matterId: string,
  matterCategory: MatterCategory
): Promise<string> {
  const suggestedName = suggestFolderByTemplateCategory("ARCHIVE", matterCategory) ?? "Lưu trữ";
  const existing = await prisma.documentFolder.findFirst({
    where: { matterId, name: suggestedName },
    select: { id: true }
  });
  if (existing) return existing.id;
  const created = await prisma.documentFolder.create({
    data: { matterId, name: suggestedName, isDefault: false, orderIndex: 99 }
  });
  return created.id;
}

/**
 * Render bìa hồ sơ → trả về Document.id
 */
export async function renderArchiveCover(
  prisma: PrismaClient,
  opts: {
    matterId: string;
    userId: string;
    extras: ArchiveExtras;
  }
): Promise<string> {
  const { tmpl, templateBuffer } = await loadBuiltinTemplate(prisma, "archive_cover");

  const baseCtx = await buildContext({ matterId: opts.matterId, userId: opts.userId });
  const matter = await prisma.matter.findUnique({
    where: { id: opts.matterId },
    select: { internalCode: true, category: true }
  });
  if (!matter) throw new Error("Vụ án không tồn tại");

  const ctx: RenderContext = {
    ...baseCtx,
    archive: {
      archiveNo: opts.extras.archiveNo,
      closedReasonCN: CLOSED_REASON_CN[opts.extras.closedReason],
      completedAtCN: toCNDate(opts.extras.completedAt),
      archivedAtCN: toCNDate(opts.extras.archivedAt),
      judgmentSummary: opts.extras.judgmentSummary ?? ""
    }
  };

  const buf = renderDocxBuffer(templateBuffer, ctx);
  const enc = encryptBuffer(buf);
  const path = await storage.writeFile(`m_${opts.matterId}`, enc.ciphertext);

  const folderId = await findOrCreateArchiveFolder(prisma, opts.matterId, matter.category);

  const fileName = `Bìa hồ sơ_${opts.extras.archiveNo}.docx`;
  const doc = await prisma.document.create({
    data: {
      matterId: opts.matterId,
      folderId,
      templateId: tmpl.id,
      templateContextSnapshot: ctx as unknown as Prisma.InputJsonValue,
      name: fileName,
      category: "PROCEDURE",
      path,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: buf.length,
      sha256: sha256(buf),
      encrypted: true,
      algorithm: enc.algorithm,
      iv: enc.iv.toString("base64"),
      authTag: enc.authTag.toString("base64"),
      tags: ["Lưu trữ", "Bìa hồ sơ", opts.extras.archiveNo],
      uploadedById: opts.userId
    }
  });
  return doc.id;
}

interface CatalogDocEntry {
  seq: number;
  name: string;
  categoryCN: string;
  uploadDate: string;
  pages: string;
  remark: string;
}

/**
 * Render mục lục hồ sơ → trả về Document.id
 *
 * Mảng documents lấy từ toàn bộ Document của vụ án (theo createdAt tăng dần);
 * loại trừ chính nó (bìa + mục lục chưa sinh) + đã xoá mềm (deletedAt).
 */
export async function renderArchiveCatalog(
  prisma: PrismaClient,
  opts: {
    matterId: string;
    userId: string;
    extras: ArchiveExtras;
    excludeDocIds?: string[]; // Thường truyền id doc bìa hồ sơ
  }
): Promise<string> {
  const { tmpl, templateBuffer } = await loadBuiltinTemplate(prisma, "archive_catalog");

  const baseCtx = await buildContext({ matterId: opts.matterId, userId: opts.userId });
  const matter = await prisma.matter.findUnique({
    where: { id: opts.matterId },
    select: { internalCode: true, category: true }
  });
  if (!matter) throw new Error("Vụ án không tồn tại");

  const docs = await prisma.document.findMany({
    where: {
      matterId: opts.matterId,
      deletedAt: null,
      ...(opts.excludeDocIds && opts.excludeDocIds.length > 0
        ? { id: { notIn: opts.excludeDocIds } }
        : {})
    },
    select: { id: true, name: true, category: true, createdAt: true },
    orderBy: { createdAt: "asc" }
  });

  const entries: CatalogDocEntry[] = docs.map((d, i) => ({
    seq: i + 1,
    name: d.name,
    categoryCN: CATEGORY_CN_DOC[d.category] ?? d.category,
    uploadDate: d.createdAt.toISOString().slice(0, 10),
    pages: "",
    remark: ""
  }));

  const ctx: RenderContext = {
    ...baseCtx,
    archive: {
      archiveNo: opts.extras.archiveNo,
      closedReasonCN: CLOSED_REASON_CN[opts.extras.closedReason],
      completedAtCN: toCNDate(opts.extras.completedAt),
      archivedAtCN: toCNDate(opts.extras.archivedAt),
      judgmentSummary: opts.extras.judgmentSummary ?? ""
    },
    documents: entries
  };

  const buf = renderDocxBuffer(templateBuffer, ctx);
  const enc = encryptBuffer(buf);
  const path = await storage.writeFile(`m_${opts.matterId}`, enc.ciphertext);

  const folderId = await findOrCreateArchiveFolder(prisma, opts.matterId, matter.category);

  const fileName = `Mục lục hồ sơ_${opts.extras.archiveNo}.docx`;
  const doc = await prisma.document.create({
    data: {
      matterId: opts.matterId,
      folderId,
      templateId: tmpl.id,
      templateContextSnapshot: ctx as unknown as Prisma.InputJsonValue,
      name: fileName,
      category: "PROCEDURE",
      path,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: buf.length,
      sha256: sha256(buf),
      encrypted: true,
      algorithm: enc.algorithm,
      iv: enc.iv.toString("base64"),
      authTag: enc.authTag.toString("base64"),
      tags: ["Lưu trữ", "Mục lục hồ sơ", opts.extras.archiveNo],
      uploadedById: opts.userId
    }
  });
  return doc.id;
}
