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

/**
 * v0.27: 服务中心 - 律所公告
 *
 * - ADMIN / 主任律师 可发布、编辑、置顶、归档
 * - 所有登录用户可读
 * - pinned + 未过期 + 未归档的公告显示为顶部 banner
 */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";

function assertCanManage(role: string) {
  if (role !== "ADMIN" && role !== "PRINCIPAL_LAWYER") {
    throw new Error("仅管理员 / 主任律师可发布公告");
  }
}

const announcementCreateSchema = z.object({
  title: z.string().min(1, "标题必填").max(120),
  content: z.string().min(1, "内容必填").max(20000),
  pinned: z.boolean().default(false),
  expiresAt: z.coerce.date().optional().nullable()
});

const announcementUpdateSchema = announcementCreateSchema.extend({
  id: z.string().cuid()
});

export async function listAnnouncements({
  includeArchived = false
}: { includeArchived?: boolean } = {}) {
  await requireSession();
  return prisma.announcement.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    include: {
      author: { select: { id: true, name: true } }
    }
  });
}

/**
 * 顶部 banner：pinned + 未归档 + 未过期
 */
export async function listActiveBanners() {
  await requireSession();
  const now = new Date();
  return prisma.announcement.findMany({
    where: {
      pinned: true,
      archivedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
    },
    orderBy: { publishedAt: "desc" },
    select: { id: true, title: true, content: true, publishedAt: true }
  });
}

export async function createAnnouncement(input: z.infer<typeof announcementCreateSchema>) {
  const session = await requireSession();
  assertCanManage(session.user.role);
  const data = announcementCreateSchema.parse(input);

  const created = await prisma.announcement.create({
    data: {
      title: data.title.trim(),
      content: data.content,
      pinned: data.pinned,
      expiresAt: data.expiresAt ?? null,
      authorId: session.user.id
    }
  });

  await audit({
    userId: session.user.id,
    action: "ANNOUNCEMENT_CREATE",
    targetType: "Announcement",
    targetId: created.id,
    detail: { title: created.title, pinned: created.pinned }
  });

  revalidatePath("/announcements");
  revalidatePath("/", "layout"); // banner 在全站布局
  return created;
}

export async function updateAnnouncement(input: z.infer<typeof announcementUpdateSchema>) {
  const session = await requireSession();
  assertCanManage(session.user.role);
  const data = announcementUpdateSchema.parse(input);

  const updated = await prisma.announcement.update({
    where: { id: data.id },
    data: {
      title: data.title.trim(),
      content: data.content,
      pinned: data.pinned,
      expiresAt: data.expiresAt ?? null
    }
  });

  await audit({
    userId: session.user.id,
    action: "ANNOUNCEMENT_UPDATE",
    targetType: "Announcement",
    targetId: data.id,
    detail: { title: updated.title, pinned: updated.pinned }
  });

  revalidatePath("/announcements");
  revalidatePath("/", "layout");
  return updated;
}

export async function archiveAnnouncement(id: string) {
  const session = await requireSession();
  assertCanManage(session.user.role);

  await prisma.announcement.update({
    where: { id },
    data: { archivedAt: new Date() }
  });

  await audit({
    userId: session.user.id,
    action: "ANNOUNCEMENT_ARCHIVE",
    targetType: "Announcement",
    targetId: id
  });

  revalidatePath("/announcements");
  revalidatePath("/", "layout");
}
