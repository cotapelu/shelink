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
