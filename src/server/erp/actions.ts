'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { audit } from '@/server/audit';

// Task schemas
const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title required'),
  description: z.string().max(2000).optional().or(z.literal('')),
  assigneeId: z.string().uuid().optional().or(z.literal('')),
  dueDate: z.coerce.date().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  projectId: z.string().uuid().optional().or(z.literal('')),
});

const UpdateTaskSchema = CreateTaskSchema.extend({
  id: z.string().uuid(),
});

const GetTasksQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED', 'CANCELLED']).optional(),
  assigneeId: z.string().uuid().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

// Actions
export async function listTasks(query: z.infer<typeof GetTasksQuerySchema>) {
  const validated = GetTasksQuerySchema.parse(query);
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const where: any = {};
  if (validated.projectId) where.projectId = validated.projectId;
  if (validated.status) where.status = validated.status;
  if (validated.assigneeId) where.assigneeId = validated.assigneeId;

  const [items, total] = await Promise.all([
    prisma.workTask.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      skip: (validated.page - 1) * validated.limit,
      take: validated.limit,
    }),
    prisma.workTask.count({ where }),
  ]);

  return { tasks: items, total, page: validated.page, totalPages: Math.ceil(total / validated.limit) };
}

export async function getTask(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const task = await prisma.workTask.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
      comments: { orderBy: { createdAt: 'desc' } },
      tags: true,
      attachments: true,
    },
  });

  if (!task) throw new Error('Task not found');
  return task;
}

export async function createTask(input: z.infer<typeof CreateTaskSchema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const data = CreateTaskSchema.parse(input);

  // If no assignee, assign to creator
  const assigneeId = data.assigneeId || session.user.id;

  const created = await prisma.workTask.create({
    data: {
      ...data,
      assigneeId,
    },
  });

  await audit({
    userId: session.user.id,
    action: 'TASK_CREATE',
    targetType: 'WorkTask',
    targetId: created.id,
    detail: { title: created.title, projectId: created.projectId },
  });

  revalidatePath('/erp/tasks');
  if (created.projectId) revalidatePath(`/erp/projects/${created.projectId}`);
  return { ok: true, id: created.id };
}

export async function updateTask(input: z.infer<typeof UpdateTaskSchema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const { id, ...rest } = UpdateTaskSchema.parse(input);

  const updated = await prisma.workTask.update({
    where: { id },
    data: rest,
  });

  await audit({
    userId: session.user.id,
    action: 'TASK_UPDATE',
    targetType: 'WorkTask',
    targetId: updated.id,
    detail: { changes: rest },
  });

  revalidatePath('/erp/tasks');
  if (updated.projectId) revalidatePath(`/erp/projects/${updated.projectId}`);
  return { ok: true };
}

export async function deleteTask(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const task = await prisma.workTask.findUnique({ where: { id }, select: { projectId: true } });

  await prisma.workTask.delete({ where: { id } });

  await audit({
    userId: session.user.id,
    action: 'TASK_DELETE',
    targetType: 'WorkTask',
    targetId: id,
    detail: {},
  });

  revalidatePath('/erp/tasks');
  if (task?.projectId) revalidatePath(`/erp/projects/${task.projectId}`);
  return { ok: true };
}

// Project actions
export async function listProjects(query?: { status?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const where: any = {};
  if (query?.status) where.status = query.status;

  const projects = await prisma.project.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
      _count: { select: { tasks: true, members: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return projects;
}

export async function getProject(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
      members: true,
      // person info via separate query if needed
      tasks: {
        include: {
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
      },
      workflows: true,
    },
  });

  if (!project) throw new Error('Project not found');
  return project;
}

const CreateProjectSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('PLANNING'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export async function createProject(input: any) { // simplifying for now
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const data = CreateProjectSchema.parse(input);

  const createdProject = await prisma.project.create({
    data: {
      ...data,
      ownerId: session.user.id,
    },
  });

  await audit({
    userId: session.user.id,
    action: 'PROJECT_CREATE',
    targetType: 'Project',
    targetId: createdProject.id,
    detail: { name: createdProject.name },
  });

  revalidatePath('/erp/projects');
  return { ok: true, id: createdProject.id };
}

export async function updateProject(input: { id: string } & Partial<z.infer<typeof CreateProjectSchema>>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const { id, ...rest } = input;

  const updated = await prisma.project.update({
    where: { id },
    data: rest,
  });

  await audit({
    userId: session.user.id,
    action: 'PROJECT_UPDATE',
    targetType: 'Project',
    targetId: updated.id,
    detail: { changes: rest },
  });

  revalidatePath(`/erp/projects/${id}`);
  return { ok: true };
}

export async function deleteProject(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  await prisma.project.delete({ where: { id } });

  await audit({
    userId: session.user.id,
    action: 'PROJECT_DELETE',
    targetType: 'Project',
    targetId: id,
    detail: {},
  });

  revalidatePath('/erp/projects');
  return { ok: true };
}
