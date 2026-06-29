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
 * 归档逾期预警：扫描已结案但超过 30 天未提交归档的案件，给主办律师发通知。
 *
 * 业务逻辑：
 * - status = CLOSED 且 closedAt < now - 30 天
 * - 未生成 ArchiveRecord（或都被 REJECTED）
 * - 同一案件 30 天内不重复发预警（refId 唯一性）
 */
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/server/notifications/create";
import { audit } from "@/server/audit";

const OVERDUE_DAYS = 30;
const REPEAT_SUPPRESS_DAYS = 30;

export type OverdueScanResult = {
  scanned: number;
  notified: number;
  suppressed: number;
};

export async function scanArchiveOverdue(): Promise<OverdueScanResult> {
  const cutoff = new Date(Date.now() - OVERDUE_DAYS * 86400_000);

  const candidates = await prisma.matter.findMany({
    where: {
      status: "CLOSED",
      closedAt: { lt: cutoff },
      deletedAt: null
    },
    select: {
      id: true,
      title: true,
      internalCode: true,
      ownerId: true,
      closedAt: true,
      archiveRecords: {
        where: { status: { in: ["PENDING_REVIEW", "APPROVED"] } },
        select: { id: true },
        take: 1
      }
    }
  });

  // 排除已有进行中或已通过的归档
  const target = candidates.filter((m) => m.archiveRecords.length === 0);

  // 防重：拉最近 30 天已发过的"ARCHIVE_OVERDUE"通知（refId = matterId）
  const repeatCutoff = new Date(Date.now() - REPEAT_SUPPRESS_DAYS * 86400_000);
  const matterIds = target.map((m) => m.id);
  const recentNotified = await prisma.notification.findMany({
    where: {
      refType: "ArchiveOverdue",
      refId: { in: matterIds },
      createdAt: { gte: repeatCutoff }
    },
    select: { refId: true }
  });
  const suppressedIds = new Set(recentNotified.map((n) => n.refId));

  let notified = 0;
  let suppressed = 0;
  for (const m of target) {
    if (!m.id || !m.ownerId || !m.closedAt) continue;
    if (suppressedIds.has(m.id)) {
      suppressed++;
      continue;
    }
    const days = Math.floor((Date.now() - m.closedAt.getTime()) / 86400_000);
    await createNotification({
      userId: m.ownerId,
      type: "SYSTEM",
      priority: "HIGH",
      title: `归档逾期：${m.internalCode}·${m.title}`,
      content: `案件已结 ${days} 天但未提交归档，请尽快补全材料后提交归档申请。`,
      href: `/matters/${m.id}`,
      refType: "ArchiveOverdue",
      refId: m.id
    });
    notified++;
  }

  await audit({
    userId: null,
    action: "ARCHIVE_OVERDUE_SCAN_CRON",
    targetType: "Report",
    targetId: "archive-overdue",
    detail: {
      scanned: candidates.length,
      target: target.length,
      notified,
      suppressed,
      overdueDays: OVERDUE_DAYS
    }
  });

  return {
    scanned: candidates.length,
    notified,
    suppressed
  };
}
