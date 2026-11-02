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

/**
 * v0.22: Cửa vào kích hoạt thủ công cho job cron (chỉ admin)
 *
 * Dùng để kiểm thử / kích hoạt khẩn cấp, không phải đợi tới thời điểm hẹn.
 */
import { requireSession } from "@/lib/auth/session";
import { runWeeklyReportPush } from "@/server/reports/push-weekly";
import { scanArchiveOverdue } from "./jobs/archive-overdue";
import { runAuditCleanup } from "./jobs/audit-cleanup";

async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("Chỉ quản trị viên / luật sư chính được kích hoạt");
  }
  return session;
}

export async function triggerWeeklyReportNow() {
  const session = await requireAdmin();
  return runWeeklyReportPush(session.user.id);
}

export async function triggerArchiveOverdueScanNow() {
  await requireAdmin();
  return scanArchiveOverdue();
}

export async function triggerAuditCleanupNow() {
  await requireAdmin();
  return runAuditCleanup();
}
