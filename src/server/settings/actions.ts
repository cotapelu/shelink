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
import type { ProcedureType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";

const stepSchema = z.object({
  name: z.string().min(1).max(40),
  order: z.number().int().min(1).max(50),
  defaultTasks: z.array(z.string().max(120)).default([])
});

const templateUpdateSchema = z.object({
  procedureType: z.string(),
  name: z.string().min(1).max(40),
  steps: z.array(stepSchema).min(1)
});

export type StepInput = z.infer<typeof stepSchema>;
export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;

async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") throw new Error("仅管理员可执行");
  return session;
}

export async function listStageTemplates() {
  await requireAdmin();
  return prisma.stageTemplate.findMany({
    orderBy: { procedureType: "asc" }
  });
}

export async function upsertStageTemplate(input: TemplateUpdateInput) {
  const session = await requireAdmin();
  const data = templateUpdateSchema.parse(input);
  const id = `default-${data.procedureType}`;

  await prisma.stageTemplate.upsert({
    where: { id },
    update: {
      name: data.name,
      steps: data.steps as unknown as object
    },
    create: {
      id,
      procedureType: data.procedureType as ProcedureType,
      name: data.name,
      isDefault: true,
      steps: data.steps as unknown as object
    }
  });

  await audit({
    userId: session.user.id,
    action: "STAGE_TEMPLATE_UPDATE",
    targetType: "StageTemplate",
    targetId: id,
    detail: { procedureType: data.procedureType, stepCount: data.steps.length }
  });

  revalidatePath("/settings/templates");
  return { ok: true };
}

const auditQuerySchema = z.object({
  action: z.string().optional(),
  userId: z.string().cuid().optional(),
  days: z.coerce.number().int().min(1).max(365).default(30),
  limit: z.coerce.number().int().min(1).max(500).default(200)
});

export type AuditQuery = z.infer<typeof auditQuerySchema>;

export async function listAuditLogs(input: Partial<AuditQuery> = {}) {
  await requireAdmin();
  const query = auditQuerySchema.parse(input);
  const since = new Date(Date.now() - query.days * 24 * 60 * 60 * 1000);

  const where: Prisma.AuditLogWhereInput = {
    createdAt: { gte: since },
    ...(query.action ? { action: { contains: query.action, mode: "insensitive" } } : {}),
    ...(query.userId ? { userId: query.userId } : {})
  };

  const [items, distinctActions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query.limit,
      include: { user: { select: { id: true, name: true } } }
    }),
    prisma.auditLog.findMany({
      where: { createdAt: { gte: since } },
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
      take: 200
    })
  ]);

  return { items, distinctActions: distinctActions.map((a) => a.action) };
}
