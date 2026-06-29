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

const WorkflowStatusEnum = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;

const CreateWorkflowSchema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  status: z.enum(WorkflowStatusEnum).default('DRAFT'),
  projectId: z.string().uuid().optional().or(z.literal('')).transform(v => v || null),
});

const UpdateWorkflowSchema = CreateWorkflowSchema.partial();

const CreateStepSchema = z.object({
  workflowId: z.string().uuid(),
  name: z.string().min(1, 'Step name required'),
  description: z.string().optional(),
  order: z.number().int().min(0).default(0),
  assigneeId: z.string().uuid().optional().or(z.literal('')),
  dueDate: z.date().optional(),
});

const UpdateStepSchema = CreateStepSchema.partial().extend({
  id: z.string().uuid(),
});

const CreateTransitionSchema = z.object({
  workflowId: z.string().uuid(),
  fromStepId: z.string().uuid(),
  toStepId: z.string().uuid(),
  condition: z.string().optional(),
  action: z.string().optional(),
  order: z.number().int().min(0).default(0),
});

const UpdateTransitionSchema = CreateTransitionSchema.partial().extend({
  id: z.string().uuid(),
});

// Workflow actions
export async function listWorkflows(query?: { projectId?: string; status?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const where: any = {};
  if (query?.projectId) where.projectId = query.projectId;
  if (query?.status) where.status = query.status;

  const workflows = await prisma.workflow.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      steps: true,
      transitions: true,
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return workflows;
}

export async function getWorkflow(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      steps: { orderBy: { order: 'asc' } },
      transitions: { orderBy: { order: 'asc' } },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!workflow) throw new Error('Workflow not found');
  return workflow;
}

export async function createWorkflow(input: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const data = CreateWorkflowSchema.parse(input);

  // Map to Prisma types (cast any for enums)
  const dbData: any = {
    ...data,
    ownerId: session.user.id,
    projectId: data.projectId || null,
  };

  const workflow = await prisma.workflow.create({
    data: dbData,
  });

  await audit({
    userId: session.user.id,
    action: 'WORKFLOW_CREATE',
    targetType: 'Workflow',
    targetId: workflow.id,
    detail: { name: workflow.name, projectId: workflow.projectId },
  });

  revalidatePath('/erp/projects');
  return { ok: true, id: workflow.id };
}

export async function updateWorkflow(input: { id: string } & Partial<z.infer<typeof UpdateWorkflowSchema>>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const { id, ...rest } = input;
  const dbData: any = { ...rest };
  if (dbData.projectId === undefined) delete dbData.projectId;
  else dbData.projectId = dbData.projectId || null;

  const updated = await prisma.workflow.update({
    where: { id },
    data: dbData,
  });

  await audit({
    userId: session.user.id,
    action: 'WORKFLOW_UPDATE',
    targetType: 'Workflow',
    targetId: updated.id,
    detail: { changes: rest },
  });

  revalidatePath(`/erp/projects/${updated.projectId}`);
  return { ok: true };
}

export async function deleteWorkflow(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const workflow = await prisma.workflow.findUnique({ where: { id }, select: { projectId: true } });

  await prisma.workflow.delete({ where: { id } });

  await audit({
    userId: session.user.id,
    action: 'WORKFLOW_DELETE',
    targetType: 'Workflow',
    targetId: id,
    detail: {},
  });

  if (workflow?.projectId) revalidatePath(`/erp/projects/${workflow.projectId}`);
  return { ok: true };
}

// WorkflowStep actions
export async function addStep(input: z.infer<typeof CreateStepSchema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const data = CreateStepSchema.parse(input);

  const dbData: any = {
    ...data,
    workflow: { connect: { id: data.workflowId } },
    assignee: data.assigneeId ? { connect: { id: data.assigneeId } } : null,
  };

  const step = await prisma.workflowStep.create({
    data: dbData,
  });

  await audit({
    userId: session.user.id,
    action: 'WORKFLOW_STEP_CREATE',
    targetType: 'WorkflowStep',
    targetId: step.id,
    detail: { workflowId: data.workflowId, name: step.name },
  });

  return { ok: true, id: step.id };
}

export async function updateStep(input: z.infer<typeof UpdateStepSchema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const { id, ...rest } = UpdateStepSchema.parse(input);

  // Handle assigneeId separately if present
  const data: any = { ...rest };
  if (data.assigneeId !== undefined) {
    data.assignee = data.assigneeId ? { connect: { id: data.assigneeId } } : { disconnect: true };
    delete data.assigneeId;
  }

  const step = await prisma.workflowStep.update({
    where: { id },
    data,
  });

  await audit({
    userId: session.user.id,
    action: 'WORKFLOW_STEP_UPDATE',
    targetType: 'WorkflowStep',
    targetId: step.id,
    detail: { changes: rest },
  });

  return { ok: true };
}

export async function deleteStep(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  await prisma.workflowStep.delete({ where: { id } });

  await audit({
    userId: session.user.id,
    action: 'WORKFLOW_STEP_DELETE',
    targetType: 'WorkflowStep',
    targetId: id,
    detail: {},
  });

  return { ok: true };
}

// WorkflowTransition actions
export async function addTransition(input: z.infer<typeof CreateTransitionSchema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const data = CreateTransitionSchema.parse(input);

  const dbData: any = {
    workflow: { connect: { id: data.workflowId } },
    fromStep: { connect: { id: data.fromStepId } },
    toStep: { connect: { id: data.toStepId } },
    condition: data.condition,
    action: data.action,
    order: data.order,
  };

  const transition = await prisma.workflowTransition.create({
    data: dbData,
  });

  await audit({
    userId: session.user.id,
    action: 'WORKFLOW_TRANSITION_CREATE',
    targetType: 'WorkflowTransition',
    targetId: transition.id,
    detail: { workflowId: data.workflowId },
  });

  return { ok: true, id: transition.id };
}

export async function updateTransition(input: z.infer<typeof UpdateTransitionSchema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const { id, ...rest } = UpdateTransitionSchema.parse(input);
  const dbData: any = { ...rest };
  if (dbData.fromStepId) {
    dbData.fromStep = { connect: { id: dbData.fromStepId } };
    delete dbData.fromStepId;
  }
  if (dbData.toStepId) {
    dbData.toStep = { connect: { id: dbData.toStepId } };
    delete dbData.toStepId;
  }
  if (dbData.workflowId) {
    dbData.workflow = { connect: { id: dbData.workflowId } };
    delete dbData.workflowId;
  }

  const updated = await prisma.workflowTransition.update({
    where: { id },
    data: dbData,
  });

  await audit({
    userId: session.user.id,
    action: 'WORKFLOW_TRANSITION_UPDATE',
    targetType: 'WorkflowTransition',
    targetId: updated.id,
    detail: { changes: rest },
  });

  return { ok: true };
}

export async function deleteTransition(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  await prisma.workflowTransition.delete({ where: { id } });

  await audit({
    userId: session.user.id,
    action: 'WORKFLOW_TRANSITION_DELETE',
    targetType: 'WorkflowTransition',
    targetId: id,
    detail: {},
  });

  return { ok: true };
}

// WorkflowAudit (if using WorkflowAudit model)
export async function getWorkflowAudits(workflowId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const audits = await prisma.workflowAudit.findMany({
    where: { workflowId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
      fromStep: true,
      toStep: true,
    },
  });

  return audits;
}
