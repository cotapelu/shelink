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
/**
 * Cảnh báo quá hạn lưu trữ: quét các vụ đã kết thúc nhưng quá 30 ngày chưa nộp lưu trữ, gửi thông báo cho luật sư chủ trì.
 *
 * Logic nghiệp vụ:
 * - status = CLOSED và closedAt < now - 30 ngày
 * - Chưa sinh ArchiveRecord (hoặc đều bị REJECTED)
 * - Cùng một vụ án không gửi lại cảnh báo trong 30 ngày (tính duy nhất theo refId)
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

  // Loại trừ các bản ghi lưu trữ đang chờ hoặc đã duyệt
  const target = candidates.filter((m) => m.archiveRecords.length === 0);

  // Chống trùng: lấy thông báo "ARCHIVE_OVERDUE" đã gửi trong 30 ngày qua (refId = matterId)
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
      title: `Quá hạn lưu trữ: ${m.internalCode}·${m.title}`,
      content: `Vụ án đã kết thúc ${days} ngày nhưng chưa nộp lưu trữ, hãy bổ sung đủ tài liệu rồi nộp yêu cầu lưu trữ.`,
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
