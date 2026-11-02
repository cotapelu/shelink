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
 * Chính sách lưu AuditLog: mỗi ngày 03:00 xoá bản ghi cũ quá N ngày.
 *
 * Mặc định 365 ngày; biến môi trường AUDIT_RETENTION_DAYS có thể ghi đè (vd 90 = 3 tháng).
 * Bảng AuditLog không có FK nào tham chiếu ngược, hard delete an toàn.
 */
import { prisma } from "@/lib/prisma";
import { audit } from "@/server/audit";

const DEFAULT_RETENTION_DAYS = 365;

export type AuditCleanupResult = {
  retentionDays: number;
  deleted: number;
  cutoffDate: string;
};

export async function runAuditCleanup(): Promise<AuditCleanupResult> {
  const envDays = Number(process.env.AUDIT_RETENTION_DAYS);
  const retentionDays =
    Number.isFinite(envDays) && envDays > 0 ? envDays : DEFAULT_RETENTION_DAYS;
  const cutoff = new Date(Date.now() - retentionDays * 86400_000);

  const { count } = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } }
  });

  // Tự ghi một dấu vết audit (dòng này 365 ngày sau lại bị chính nó xoá, nhưng trong ngắn hạn tra được)
  await audit({
    userId: null,
    action: "AUDIT_CLEANUP_CRON",
    targetType: "AuditLog",
    targetId: "retention",
    detail: {
      retentionDays,
      cutoffDate: cutoff.toISOString().slice(0, 10),
      deleted: count
    }
  });

  return {
    retentionDays,
    deleted: count,
    cutoffDate: cutoff.toISOString().slice(0, 10)
  };
}
