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
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  projectId: z.string().uuid().optional().or(z.literal('')),
});

const UpdateTaskSchema = CreateTaskSchema.extend({
  id: z.string().uuid(),
});

const GetTasksQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled']).optional(),
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

  // Map to frontend types (lowercase enums)
  const tasks = items.map(t => ({
    ...t,
    status: (t.status as string).toLowerCase() as any,
    priority: (t.priority as string).toLowerCase() as any,
  }));

  return { tasks, total, page: validated.page, totalPages: Math.ceil(total / validated.limit) }as any;
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
  // Map enums to lowercase for frontend
  const mapped = {
    ...task,
    status: (task.status as string).toLowerCase() as any,
    priority: (task.priority as string).toLowerCase() as any,
  };
  return mapped as any;
}

export async function createTask(input: z.infer<typeof CreateTaskSchema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const data = CreateTaskSchema.parse(input);

  // If no assignee, assign to creator
  const assigneeId = data.assigneeId || session.user.id;

  // Map lowercase enums to DB enums
  const dbData: any = {
    ...data,
    assigneeId,
  };
  if (data.priority) {
    const priorityMap: Record<string, string> = { low: 'LOW', medium: 'MEDIUM', high: 'HIGH', urgent: 'CRITICAL' };
    dbData.priority = priorityMap[data.priority as keyof typeof priorityMap] as any;
  }

  const created = await prisma.workTask.create({
    data: dbData,
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

  const inputParsed = UpdateTaskSchema.parse(input);
  const { id } = inputParsed;
  const rest: any = { ...inputParsed };
  delete rest.id;

  // Map enums
  if (rest.priority) {
    const priorityMap: Record<string, string> = { low: 'LOW', medium: 'MEDIUM', high: 'HIGH', urgent: 'CRITICAL' };
    rest.priority = priorityMap[rest.priority as keyof typeof priorityMap] as any;
  }
  if (rest.status) {
    const statusMap: Record<string, string> = { 
      todo: 'TODO', in_progress: 'IN_PROGRESS', review: 'REVIEW', done: 'DONE', blocked: 'BLOCKED', cancelled: 'CANCELLED'
    };
    rest.status = statusMap[rest.status as keyof typeof statusMap] as any;
  }

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

// Dashboard stats
export async function getDashboardStats() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const now = new Date();
  const [totalTasks, totalProjects, overdueTasks, activeTeams] = await Promise.all([
    prisma.workTask.count(),
    prisma.project.count(),
    prisma.workTask.count({
      where: {
        dueDate: { lt: now },
        status: { in: ['TODO', 'IN_PROGRESS', 'REVIEW'] },
      },
    }),
    prisma.team.count(),
  ]);

  return { totalTasks, totalProjects, overdueTasks, activeTeams };
}
