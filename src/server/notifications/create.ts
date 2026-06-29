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
import type { NotificationPriority, NotificationType } from "@prisma/client";

type CreateNotificationInput = {
  userId: string;
  type: string;
  priority?: string;
  title: string;
  content?: string;
  href?: string;
  refType?: string;
  refId?: string;
};

/** 通用通知创建 helper，被其他 server action 调用 */
export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type as NotificationType,
      priority: (input.priority ?? "NORMAL") as NotificationPriority,
      title: input.title,
      content: input.content,
      href: input.href,
      refType: input.refType,
      refId: input.refId,
    },
  });
}
