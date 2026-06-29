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

import type { NotificationPriority, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/server/notifications/create";

type ApprovalNotificationInput = {
  roles: UserRole[];
  excludeUserId?: string;
  title: string;
  content?: string;
  href: string;
  refType: string;
  refId: string;
  priority?: NotificationPriority;
};

type DirectApprovalNotificationInput = Omit<ApprovalNotificationInput, "roles"> & {
  userIds: string[];
};

async function notifyUsers(input: DirectApprovalNotificationInput) {
  const uniqueUserIds = Array.from(new Set(input.userIds)).filter(
    (id) => id && id !== input.excludeUserId
  );
  if (uniqueUserIds.length === 0) return;

  await Promise.all(
    uniqueUserIds.map((userId) =>
      createNotification({
        userId,
        type: "SYSTEM",
        priority: input.priority ?? "HIGH",
        title: input.title,
        content: input.content,
        href: input.href,
        refType: input.refType,
        refId: input.refId
      })
    )
  );
}

export async function notifyRoleApprovers(input: ApprovalNotificationInput) {
  const users = await prisma.user.findMany({
    where: {
      active: true,
      role: { in: Array.from(new Set(input.roles)) }
    },
    select: { id: true }
  });

  await notifyUsers({
    ...input,
    userIds: users.map((user) => user.id)
  });
}

export async function notifyDirectApprovers(input: DirectApprovalNotificationInput) {
  const users = await prisma.user.findMany({
    where: {
      active: true,
      id: { in: Array.from(new Set(input.userIds)) }
    },
    select: { id: true }
  });

  await notifyUsers({
    ...input,
    userIds: users.map((user) => user.id)
  });
}
