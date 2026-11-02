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
import { storage } from "@/lib/storage";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanLeadMatter } from "@/lib/permissions";
import { decryptBuffer, encryptBuffer, sha256 } from "@/lib/storage/crypto";
import { buildContext, renderDocxBuffer, detectMissing } from "@/lib/template-engine";
import { suggestFolderByTemplateCategory } from "@/lib/default-folders";
import {
  templateListFilterSchema,
  templateToggleSchema,
  templateRenderSchema
} from "./schemas";

export async function listTemplates(input?: z.input<typeof templateListFilterSchema>) {
  await requireSession();
  const filter = templateListFilterSchema.parse(input ?? {});

  const where: Prisma.DocumentTemplateWhereInput = {};
  if (filter.onlyEnabled) where.enabled = true;
  if (filter.category) where.category = filter.category;
  if (filter.matterCategory) {
    // applicableCategories rỗng = áp dụng tất cả; chứa mục tiêu cũng khớp
    where.OR = [
      { applicableCategories: { isEmpty: true } },
      { applicableCategories: { has: filter.matterCategory } }
    ];
  }

  return prisma.documentTemplate.findMany({
    where,
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      applicableCategories: true,
      variables: true,
      isBuiltIn: true,
      enabled: true,
      updatedAt: true
    }
  });
}

export async function getTemplate(id: string) {
  await requireSession();
  return prisma.documentTemplate.findUnique({
    where: { id },
    include: {
      docxBlob: { select: { id: true, name: true, size: true } },
      createdBy: { select: { id: true, name: true } }
    }
  });
}

export async function toggleTemplate(input: z.infer<typeof templateToggleSchema>) {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("Chỉ quản trị viên được bật/tắt mẫu");
  }
  const data = templateToggleSchema.parse(input);

  await prisma.documentTemplate.update({
    where: { id: data.id },
    data: { enabled: data.enabled }
  });

  await audit({
    userId: session.user.id,
    action: "TEMPLATE_TOGGLE",
    targetType: "DocumentTemplate",
    targetId: data.id,
    detail: { enabled: data.enabled }
  });

  revalidatePath("/settings/templates");
  return { ok: true };
}

/**
 * Render mẫu + lưu trữ
 *   1. Kiểm tra đầu vào và quyền
 *   2. Đọc và giải mã docx của mẫu
 *   3. Lắp ngữ cảnh (gồm ghi lại overrides điền nội tuyến)
 *   4. Render → mã hoá lưu vào Document (gắn matter / folder / template / snapshot ngữ cảnh)
 *   5. Trả về documentId mới, UI dùng để tải xuống
 */
export async function renderTemplate(input: z.infer<typeof templateRenderSchema>) {
  const session = await requireSession();
  const data = templateRenderSchema.parse(input);

  await assertMatterWritable(data.matterId);
  await assertCanLeadMatter(session.user.id, data.matterId, "Chỉ chủ trì/cộng tác của vụ án được sinh văn bản");

  // Lấy mẫu + docxBlob
  const tmpl = await prisma.documentTemplate.findUnique({
    where: { id: data.templateId },
    include: { docxBlob: true }
  });
  if (!tmpl || !tmpl.enabled) throw new Error("Mẫu không tồn tại hoặc đã tắt");
  if (!tmpl.docxBlob) throw new Error("Thiếu tệp nguồn của mẫu");

  // Kiểm tra folder cùng vụ án
  if (data.folderId) {
    const folder = await prisma.documentFolder.findUnique({
      where: { id: data.folderId },
      select: { matterId: true }
    });
    if (!folder || folder.matterId !== data.matterId) {
      throw new Error("Hồ sơ đích không khớp với vụ án");
    }
  }

  // Lấy vụ án + tệp nguồn mẫu
  const matter = await prisma.matter.findUnique({
    where: { id: data.matterId },
    select: { internalCode: true, category: true }
  });
  if (!matter) throw new Error("Vụ án không tồn tại");

  const rawCt = await storage.readFile(tmpl.docxBlob.path);
  const templateBuffer = tmpl.docxBlob.encrypted
    ? decryptBuffer(rawCt, tmpl.docxBlob.iv ?? "", tmpl.docxBlob.authTag ?? "")
    : rawCt;

  // Ngữ cảnh (áp dụng overrides điền nội tuyến)
  const context = await buildContext({
    matterId: data.matterId,
    userId: session.user.id,
    overrides: data.overrides
  });

  // Phát hiện biến chưa điền (điền nội tuyến đã ghi DB → buildContext sẽ đọc; phần còn lại là thiếu thật)
  const required = Array.isArray(tmpl.variables) ? (tmpl.variables as string[]) : [];
  const missing = detectMissing(required, context);

  // Render
  const renderedBuf = renderDocxBuffer(templateBuffer, context);
  const enc = encryptBuffer(renderedBuf);
  const path = await storage.writeFile(`m_${data.matterId}`, enc.ciphertext);

  // Nếu không chỉ định folder, gợi ý theo nhóm mẫu
  let folderId = data.folderId;
  if (!folderId) {
    const suggestedName = suggestFolderByTemplateCategory(tmpl.category, matter.category);
    if (suggestedName) {
      const f = await prisma.documentFolder.findFirst({
        where: { matterId: data.matterId, name: suggestedName },
        select: { id: true }
      });
      if (f) folderId = f.id;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const fileName = `${tmpl.name}_${matter.internalCode}_${today}.docx`;

  const doc = await prisma.document.create({
    data: {
      matterId: data.matterId,
      folderId: folderId ?? undefined,
      templateId: tmpl.id,
      templateContextSnapshot: context as unknown as Prisma.InputJsonValue,
      name: fileName,
      category: "OTHER",
      path,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: renderedBuf.length,
      sha256: sha256(renderedBuf),
      encrypted: true,
      algorithm: enc.algorithm,
      iv: enc.iv.toString("base64"),
      authTag: enc.authTag.toString("base64"),
      tags: ["Sinh từ mẫu", tmpl.name],
      uploadedById: session.user.id
    }
  });

  await audit({
    userId: session.user.id,
    action: "TEMPLATE_RENDER",
    targetType: "Document",
    targetId: doc.id,
    detail: { templateId: tmpl.id, templateName: tmpl.name, matterId: data.matterId }
  });

  revalidatePath(`/matters/${data.matterId}`);
  return { ok: true, documentId: doc.id, fileName, missing };
}
