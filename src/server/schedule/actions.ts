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
import { matterAssociationFilter, matterVisibilityFilter } from "@/lib/permissions";

export type ScheduleItem = {
  id: string;
  type: "hearing" | "deadline" | "task";
  title: string;
  occurredAt: Date;
  matter: { id: string; internalCode: string; title: string };
  clientName: string | null;
  procedureLabel?: string;
  completed?: boolean;
  remindDays?: number;
  category?: string;
  description?: string | null;
  priority?: number;
};

export async function listScheduleItems(params: {
  from?: Date;
  to?: Date;
  includeCompleted?: boolean;
  onlyMine?: boolean;
} = {}) {
  const session = await requireSession();
  const from = params.from ?? new Date(new Date().setHours(0, 0, 0, 0));
  const to = params.to ?? new Date(from.getTime() + 365 * 24 * 60 * 60 * 1000);
  const userId = session.user.id;

  const matterFilter = params.onlyMine
    ? matterAssociationFilter(userId)
    : matterVisibilityFilter(userId, session.user.role);

  const [hearings, deadlines, tasks] = await Promise.all([
    prisma.hearing.findMany({
      where: {
        startsAt: { gte: from, lte: to },
        procedure: {
          engagement: "ENGAGED",
          matter: { deletedAt: null, ...matterFilter }
        }
      },
      include: {
        procedure: {
          select: {
            type: true,
            customLabel: true,
            matter: {
              select: {
                id: true,
                internalCode: true,
                title: true,
                primaryClient: { select: { name: true } },
                clientLinks: {
                  select: {
                    isPrimary: true,
                    client: { select: { name: true } }
                  },
                  orderBy: [{ isPrimary: "desc" }, { addedAt: "asc" }]
                }
              }
            }
          }
        }
      }
    }),
    prisma.deadline.findMany({
      where: {
        dueAt: { gte: from, lte: to },
        ...(params.includeCompleted ? {} : { completed: false }),
        procedure: {
          engagement: "ENGAGED",
          matter: { deletedAt: null, ...matterFilter }
        }
      },
      include: {
        procedure: {
          select: {
            type: true,
            customLabel: true,
            matter: {
              select: {
                id: true,
                internalCode: true,
                title: true,
                primaryClient: { select: { name: true } },
                clientLinks: {
                  select: {
                    isPrimary: true,
                    client: { select: { name: true } }
                  },
                  orderBy: [{ isPrimary: "desc" }, { addedAt: "asc" }]
                }
              }
            }
          }
        }
      }
    }),
    // Temporarily skip ERP tasks (WorkTask) - they don't have matter relation yet
    [] as any
  ]);

  const items: ScheduleItem[] = [];
  const clientNameOf = (matter: {
    primaryClient: { name: string } | null;
    clientLinks: { isPrimary: boolean; client: { name: string } }[];
  }) =>
    matter.primaryClient?.name ??
    matter.clientLinks.find((link) => link.isPrimary)?.client.name ??
    matter.clientLinks[0]?.client.name ??
    null;
  const matterBrief = (matter: { id: string; internalCode: string; title: string }) => ({
    id: matter.id,
    internalCode: matter.internalCode,
    title: matter.title
  });

  for (const h of hearings) {
    const matter = h.procedure.matter;
    items.push({
      id: `h-${h.id}`,
      type: "hearing",
      title: h.title,
      occurredAt: h.startsAt,
      matter: matterBrief(matter),
      clientName: clientNameOf(matter),
      procedureLabel: h.procedure.customLabel ?? h.procedure.type
    });
  }
  for (const d of deadlines) {
    const matter = d.procedure.matter;
    items.push({
      id: `d-${d.id}`,
      type: "deadline",
      title: d.title,
      occurredAt: d.dueAt,
      matter: matterBrief(matter),
      clientName: clientNameOf(matter),
      procedureLabel: d.procedure.customLabel ?? d.procedure.type,
      completed: d.completed,
      remindDays: d.remindDays,
      category: d.category
    });
  }
  for (const t of tasks) {
    if (!t.dueDate) continue;
    items.push({
      id: `t-${t.id}`,
      type: "task",
      title: t.title,
      occurredAt: t.dueDate,
      matter: matterBrief(t.matter),
      clientName: clientNameOf(t.matter),
      completed: t.completed,
      description: t.description,
      priority: t.priority
    });
  }
  items.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  return items;
}
