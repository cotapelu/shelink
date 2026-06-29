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

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { createNotification } from "@/server/notifications/create";
import { assertCanAssociateMatter } from "@/lib/permissions";
import { assertMatterWritable } from "@/lib/archive/guard";

const taskCreateSchema = z.object({
  matterId: z.string().cuid(),
  title: z.string().min(1, "事项标题必填").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  assigneeId: z.string().cuid().optional().or(z.literal("")),
  dueAt: z.coerce.date().optional(),
  priority: z.coerce.number().int().min(0).max(2).default(0),
  stageId: z.string().cuid().optional().or(z.literal(""))
});

const taskUpdateSchema = taskCreateSchema.extend({
  id: z.string().cuid()
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

export async function createTask(input: TaskCreateInput) {
  const session = await requireSession();
  const data = taskCreateSchema.parse(input);
  await assertCanAssociateMatter(session.user.id, data.matterId);
  await assertMatterWritable(data.matterId);

  const created = await prisma.legalTask.create({
    data: {
      matterId: data.matterId,
      title: data.title,
      description: data.description || null,
      assigneeId: data.assigneeId || null,
      dueAt: data.dueAt,
      priority: data.priority,
      stageId: data.stageId || null
    }
  });

  await audit({
    userId: session.user.id,
    action: "TASK_CREATE",
    targetType: "LegalTask",
    targetId: created.id,
    detail: { matterId: data.matterId, title: created.title }
  });

  await prisma.timelineEvent.create({
    data: {
      matterId: data.matterId,
      eventType: "TASK_ADDED",
      title: `新增事项：${created.title}`,
      occurredAt: new Date(),
      refType: "LegalTask",
      refId: created.id
    }
  });

  if (data.assigneeId && data.assigneeId !== session.user.id) {
    await createNotification({
      userId: data.assigneeId,
      type: "TASK_ASSIGNED",
      title: "您有新事项",
      content: `事项「${created.title}」已指派给您`,
      href: `/matters/${data.matterId}`,
      refType: "LegalTask",
      refId: created.id
    });
  }

  revalidatePath(`/matters/${data.matterId}`);
  return { ok: true, id: created.id };
}

export async function updateTask(input: TaskUpdateInput) {
  const session = await requireSession();
  const data = taskUpdateSchema.parse(input);
  await assertCanAssociateMatter(session.user.id, data.matterId);
  await assertMatterWritable(data.matterId);
  const { id, matterId, ...rest } = data;

  const updated = await prisma.legalTask.update({
    where: { id },
    data: {
      title: rest.title,
      description: rest.description || null,
      assigneeId: rest.assigneeId || null,
      dueAt: rest.dueAt,
      priority: rest.priority,
      stageId: rest.stageId || null
    }
  });

  await audit({
    userId: session.user.id,
    action: "TASK_UPDATE",
    targetType: "LegalTask",
    targetId: updated.id,
    detail: { changes: rest }
  });

  revalidatePath(`/matters/${matterId}`);
  return { ok: true };
}

export async function deleteTask(id: string) {
  const session = await requireSession();

  // Get matterId for revalidation before delete
  const task = await prisma.legalTask.findUnique({ where: { id }, select: { matterId: true } });
  if (!task) throw new Error("Task not found");

  await prisma.legalTask.delete({ where: { id } });

  await audit({
    userId: session.user.id,
    action: "TASK_DELETE",
    targetType: "LegalTask",
    targetId: id,
    detail: {}
  });

  revalidatePath(`/matters/${task.matterId}`);
  return { ok: true };
}

export async function getTask(id: string) {
  const task = await prisma.legalTask.findUnique({
    where: { id },
    include: {
      matter: {
        select: {
          id: true,
          internalCode: true,
          title: true
        }
      }
    }
  });
  if (!task) throw new Error("Task not found");
  return task;
}

export async function listTasks(params?: { matterId?: string; assigneeId?: string; completed?: boolean }) {
  const where: any = {};
  if (params?.matterId) where.matterId = params.matterId;
  if (params?.assigneeId) where.assigneeId = params.assigneeId;
  if (params?.completed !== undefined) where.completed = params.completed;

  const tasks = await prisma.legalTask.findMany({
    where,
    include: {
      matter: {
        select: {
          id: true,
          internalCode: true,
          title: true
        }
      }
    },
    orderBy: [{ dueAt: 'asc' }]
  });
  return tasks;
}
