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
/**
 * v0.21: 律师周报数据聚合（per-user 视角）
 *
 * 周定义：周一 00:00:00 → 下周一 00:00:00（半开区间）
 */
import { prisma } from "@/lib/prisma";
import type { ReportPeriod } from "./queries";

export function weekPeriod(now = new Date()): ReportPeriod {
  // 周一 = 0
  const dow = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    label: `${fmt(monday)} ~ ${fmt(new Date(nextMonday.getTime() - 86400_000))}`,
    start: monday,
    end: nextMonday
  };
}

export type LawyerWeeklyDigest = {
  userId: string;
  userName: string;
  period: ReportPeriod;
  newIntake: number;
  closed: number;
  archived: number;
  receivedAmount: number;
};

/**
 * 单个律师本周摘要。复用单条查询，调用方循环。
 */
export async function getLawyerWeeklyDigest(input: {
  userId: string;
  userName: string;
  period?: ReportPeriod;
}): Promise<LawyerWeeklyDigest> {
  const period = input.period ?? weekPeriod();

  const [newIntake, closed, archived, fees] = await Promise.all([
    prisma.matter.count({
      where: {
        ownerId: input.userId,
        createdAt: { gte: period.start, lt: period.end },
        deletedAt: null
      }
    }),
    prisma.matter.count({
      where: {
        ownerId: input.userId,
        closedAt: { gte: period.start, lt: period.end },
        deletedAt: null
      }
    }),
    prisma.matter.count({
      where: {
        ownerId: input.userId,
        archivedAt: { gte: period.start, lt: period.end },
        deletedAt: null
      }
    }),
    prisma.feeEntry.aggregate({
      where: {
        type: "RECEIVED",
        occurredAt: { gte: period.start, lt: period.end },
        matter: { ownerId: input.userId }
      },
      _sum: { amount: true }
    })
  ]);

  return {
    userId: input.userId,
    userName: input.userName,
    period,
    newIntake,
    closed,
    archived,
    receivedAmount: fees._sum.amount ? Number(fees._sum.amount) : 0
  };
}

export function formatWeeklyDigestContent(d: LawyerWeeklyDigest): string {
  const parts = [
    `新收 ${d.newIntake} 件`,
    `已结 ${d.closed} 件`,
    `已归档 ${d.archived} 件`,
    `收款 ${d.receivedAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 元`
  ];
  return parts.join(" · ");
}
