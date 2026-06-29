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

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

export async function getNotifications(params?: { unreadOnly?: boolean; limit?: number }) {
  const session = await requireSession();
  const limit = params?.limit ?? 30;

  return prisma.notification.findMany({
    where: {
      userId: session.user.id,
      ...(params?.unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadCount() {
  const session = await requireSession();
  return prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });
}

export async function markNotificationRead(id: string) {
  const session = await requireSession();
  const notif = await prisma.notification.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!notif) throw new Error("通知不存在");

  return prisma.notification.update({
    where: { id },
    data: { read: true, readAt: new Date() },
  });
}

export async function markAllNotificationsRead() {
  const session = await requireSession();
  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true, readAt: new Date() },
  });
  return { ok: true };
}
