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
 * v0.38: Cửa vào Server Action gọi được cho việc quét nhắc.
 *
 * Tách riêng file (top-level "use server") vì scan-due-reminders.ts đồng thời export hàm thường,
 * "use server" nội tuyến không thể bị client component import (giới hạn Next 14).
 */
import { scanDueReminders, type DueReminderScanResult } from "@/server/cron/jobs/scan-due-reminders";
import { requireSession } from "@/lib/auth/session";

/** admin / luật sư chính có thể quét ngay một lượt (kiểm thử dần + đẩy bù khẩn cấp + kiểm tra dev local) */
export async function triggerDueReminderScan(): Promise<DueReminderScanResult> {
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("Chỉ quản trị viên / luật sư chính được kích hoạt thủ công quét nhắc đến hạn");
  }
  return scanDueReminders();
}
