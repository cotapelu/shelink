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
 * v0.38: 提醒扫描的可调用 Server Action 入口。
 *
 * 单独成文件（顶层 "use server"）是因为 scan-due-reminders.ts 同时导出普通函数，
 * 内联 "use server" 无法被客户端组件 import（Next 14 限制）。
 */
import { scanDueReminders, type DueReminderScanResult } from "@/server/cron/jobs/scan-due-reminders";
import { requireSession } from "@/lib/auth/session";

/** admin / 主任律师可立即扫一遍（灰度验证 + 紧急补推 + 本地 dev 验证） */
export async function triggerDueReminderScan(): Promise<DueReminderScanResult> {
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("仅管理员 / 主任律师可手动触发到期提醒扫描");
  }
  return scanDueReminders();
}
