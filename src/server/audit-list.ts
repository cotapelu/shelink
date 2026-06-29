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

/**
 * v0.22: AuditLog 查询（admin-only 审计回放）
 */
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

export type AuditFilter = {
  userId?: string;
  action?: string;
  targetType?: string;
  startStr?: string; // yyyy-MM-dd
  endStr?: string;
  limit?: number;
  cursor?: string; // 上一页最后一条 id
};

export type AuditEntry = {
  id: string;
  createdAt: Date;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: unknown;
  ip: string | null;
  user: { id: string; name: string } | null;
};

export type AuditListResult = {
  items: AuditEntry[];
  nextCursor: string | null;
};

async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("仅管理员 / 主任律师可访问审计日志");
  }
  return session;
}

function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export async function listAuditLogs(filter: AuditFilter): Promise<AuditListResult> {
  await requireAdmin();
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);

  const where: Record<string, unknown> = {};
  if (filter.userId) where.userId = filter.userId;
  if (filter.action) where.action = filter.action;
  if (filter.targetType) where.targetType = filter.targetType;

  const start = parseDate(filter.startStr);
  const end = parseDate(filter.endStr);
  if (start || end) {
    const range: Record<string, Date> = {};
    if (start) range.gte = start;
    if (end) {
      const exclusiveEnd = new Date(end);
      exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
      range.lt = exclusiveEnd;
    }
    where.createdAt = range;
  }

  const items = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      createdAt: true,
      action: true,
      targetType: true,
      targetId: true,
      detail: true,
      ip: true,
      user: { select: { id: true, name: true } }
    }
  });

  const hasMore = items.length > limit;
  const trimmed = hasMore ? items.slice(0, limit) : items;
  return {
    items: trimmed,
    nextCursor: hasMore ? trimmed[trimmed.length - 1].id : null
  };
}

/**
 * 拉所有出现过的 action / targetType / user，用于前端筛选下拉。
 * 直接 distinct 查询，结果数有限（业务里 action 类型有限）。
 */
export async function getAuditFilterOptions(): Promise<{
  actions: string[];
  targetTypes: string[];
  users: { id: string; name: string }[];
}> {
  await requireAdmin();
  const [actionsRaw, targetsRaw, users] = await Promise.all([
    prisma.auditLog.findMany({
      select: { action: true },
      distinct: ["action"],
      take: 200
    }),
    prisma.auditLog.findMany({
      where: { targetType: { not: null } },
      select: { targetType: true },
      distinct: ["targetType"],
      take: 100
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ]);
  return {
    actions: actionsRaw.map((r) => r.action).sort(),
    targetTypes: targetsRaw.map((r) => r.targetType!).sort(),
    users
  };
}
