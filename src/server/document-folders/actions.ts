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
import { assertCanAccessMatter, assertCanLeadMatter } from "@/lib/permissions";
import {
  folderCreateSchema,
  folderRenameSchema,
  folderDeleteSchema,
  folderReorderSchema,
  moveDocumentToFolderSchema
} from "./schemas";

/** Xác định người dùng hiện tại có sửa được cấu trúc hồ sơ của vụ án không (chỉ LEAD / CO_LEAD của vụ án) */
async function requireFolderEditor(matterId: string, session: { user: { id: string; role: string } }) {
  await assertCanLeadMatter(session.user.id, matterId, "Chỉ chủ trì/cộng tác của vụ án được quản lý hồ sơ");
}

export async function listFoldersByMatter(matterId: string) {
  const session = await requireSession();
  await assertCanAccessMatter(session.user.id, session.user.role, matterId);
  return prisma.documentFolder.findMany({
    where: { matterId },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { documents: true } }
    }
  });
}

export async function createFolder(input: z.infer<typeof folderCreateSchema>) {
  const session = await requireSession();
  const data = folderCreateSchema.parse(input);
  await requireFolderEditor(data.matterId, session);
  await assertMatterWritable(data.matterId);

  // Tính orderIndex (thêm vào cuối)
  const last = await prisma.documentFolder.findFirst({
    where: { matterId: data.matterId },
    orderBy: { orderIndex: "desc" },
    select: { orderIndex: true }
  });
  const orderIndex = (last?.orderIndex ?? -1) + 1;

  let created;
  try {
    created = await prisma.documentFolder.create({
      data: {
        matterId: data.matterId,
        name: data.name.trim(),
        orderIndex,
        isDefault: false
      }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error(`Đã có hồ sơ trùng tên "${data.name.trim()}"`);
    }
    throw e;
  }

  await audit({
    userId: session.user.id,
    action: "FOLDER_CREATE",
    targetType: "DocumentFolder",
    targetId: created.id,
    detail: { matterId: data.matterId, name: data.name }
  });

  revalidatePath(`/matters/${data.matterId}`);
  return { ok: true, id: created.id };
}

export async function renameFolder(input: z.infer<typeof folderRenameSchema>) {
  const session = await requireSession();
  const data = folderRenameSchema.parse(input);

  const folder = await prisma.documentFolder.findUnique({
    where: { id: data.id },
    select: { id: true, matterId: true }
  });
  if (!folder) throw new Error("Hồ sơ không tồn tại");
  await requireFolderEditor(folder.matterId, session);
  await assertMatterWritable(folder.matterId);

  try {
    await prisma.documentFolder.update({
      where: { id: data.id },
      data: { name: data.name.trim() }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error(`Đã có hồ sơ trùng tên "${data.name.trim()}"`);
    }
    throw e;
  }

  await audit({
    userId: session.user.id,
    action: "FOLDER_RENAME",
    targetType: "DocumentFolder",
    targetId: data.id,
    detail: { name: data.name }
  });

  revalidatePath(`/matters/${folder.matterId}`);
  return { ok: true };
}

export async function deleteFolder(input: z.infer<typeof folderDeleteSchema>) {
  const session = await requireSession();
  const data = folderDeleteSchema.parse(input);

  const folder = await prisma.documentFolder.findUnique({
    where: { id: data.id },
    select: { id: true, matterId: true, isDefault: true, _count: { select: { documents: true } } }
  });
  if (!folder) throw new Error("Hồ sơ không tồn tại");
  if (folder.isDefault) throw new Error("Hồ sơ mặc định không xoá được, chỉ đổi tên");
  await requireFolderEditor(folder.matterId, session);
  await assertMatterWritable(folder.matterId);

  // Tài liệu trong hồ sơ không xoá, chuyển sang "tài liệu rời" (folderId = null)
  await prisma.$transaction([
    prisma.document.updateMany({
      where: { folderId: data.id },
      data: { folderId: null }
    }),
    prisma.documentFolder.delete({ where: { id: data.id } })
  ]);

  await audit({
    userId: session.user.id,
    action: "FOLDER_DELETE",
    targetType: "DocumentFolder",
    targetId: data.id,
    detail: { matterId: folder.matterId, documentsReleased: folder._count.documents }
  });

  revalidatePath(`/matters/${folder.matterId}`);
  return { ok: true };
}

export async function reorderFolders(input: z.infer<typeof folderReorderSchema>) {
  const session = await requireSession();
  const data = folderReorderSchema.parse(input);
  await requireFolderEditor(data.matterId, session);
  await assertMatterWritable(data.matterId);

  await prisma.$transaction(
    data.orderedIds.map((id, i) =>
      prisma.documentFolder.update({
        where: { id },
        data: { orderIndex: i }
      })
    )
  );

  revalidatePath(`/matters/${data.matterId}`);
  return { ok: true };
}

export async function moveDocumentToFolder(input: z.infer<typeof moveDocumentToFolderSchema>) {
  const session = await requireSession();
  const data = moveDocumentToFolderSchema.parse(input);

  const doc = await prisma.document.findUnique({
    where: { id: data.documentId },
    select: { id: true, matterId: true }
  });
  if (!doc || !doc.matterId) throw new Error("Tài liệu không tồn tại hoặc chưa thuộc vụ án");

  // Kiểm tra hồ sơ đích cùng vụ án với tài liệu
  if (data.folderId) {
    const folder = await prisma.documentFolder.findUnique({
      where: { id: data.folderId },
      select: { matterId: true }
    });
    if (!folder || folder.matterId !== doc.matterId) {
      throw new Error("Hồ sơ đích và tài liệu không cùng một vụ án");
    }
  }
  await requireFolderEditor(doc.matterId, session);
  await assertMatterWritable(doc.matterId);

  await prisma.document.update({
    where: { id: data.documentId },
    data: { folderId: data.folderId }
  });

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_MOVE_FOLDER",
    targetType: "Document",
    targetId: data.documentId,
    detail: { folderId: data.folderId }
  });

  revalidatePath(`/matters/${doc.matterId}`);
  return { ok: true };
}
