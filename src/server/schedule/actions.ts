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
