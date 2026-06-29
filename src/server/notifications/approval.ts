/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
