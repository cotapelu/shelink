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
 * v0.22: Lap lich cron trong tien trinh (node-cron)
 *
 * Duoc goi qua instrumentation.ts → register() khi tien trinh next start khoi dong.
 *
 * Han che:
 * - **Chi co hieu luc o next start (production)**. Che do dev khong chay (tranh day thong bao nham khi phat trien).
 * - Khong ho tro serverless (Vercel Edge / Lambda). Kich ban LawLink tu trien khai mac dinh la
 *   tien trinh Node lau dai, OK.
 * - Khoi dong lai tien trinh se dang ky lai cac tac vu dinh ky; neu khoi dong dung vao thoi diem kich hoat co the bo qua lan nay.
 *
 * Cac tac vu dinh ky hien tai:
 * - 09:00 thu Hai hang tuan: day bao cao tuan nay
 * - 09:00 hang ngay: quet cac vu luu tru qua han 30 ngay
 * - 03:00 hang ngay: don dep AuditLog qua N ngay
 *
 * Mui gio: moi cron dung Asia/Shanghai (tranh lech 8 tieng khi chay container o UTC).
 *
 * v0.26 kha nang quan sat cua cron:
 * - Duong thanh cong do moi job tu ghi audit *_CRON (da co)
 * - Duong that bai bat thong nhat o day + ghi audit *_FAILED_CRON, tranh cron that bai am tham
 */
import cron from "node-cron";
import { runWeeklyReportPush } from "@/server/reports/push-weekly";
import { scanArchiveOverdue } from "./jobs/archive-overdue";
import { runAuditCleanup } from "./jobs/audit-cleanup";
import { scanDueReminders } from "./jobs/scan-due-reminders";
import { scanSealBackfillReminders } from "./jobs/scan-seal-backfill-reminders";
import { audit } from "@/server/audit";

const TIMEZONE = "Asia/Shanghai";
let started = false;

async function runWithFailureAudit(
  jobName: string,
  failureAction: string,
  fn: () => Promise<unknown>
) {
  const startedAt = Date.now();
  const triggeredAt = new Date().toISOString();
  console.log(`[cron] ${triggeredAt} kich hoat: ${jobName}`);
  try {
    const result = await fn();
    const durationMs = Date.now() - startedAt;
    console.log(`[cron] ${jobName} xong (${durationMs}ms)`, result);
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);
    const stack =
      err instanceof Error
        ? err.stack?.split("\n").slice(0, 5).join("\n")
        : undefined;
    console.error(`[cron] ${jobName} loi (${durationMs}ms):`, err);
    await audit({
      userId: null,
      action: failureAction,
      targetType: "Cron",
      targetId: jobName,
      detail: { error: message, stack, durationMs, triggeredAt }
    });
  }
}

export function registerCronJobs() {
  if (started) {
    console.warn("[cron] registerCronJobs goi lai, bo qua");
    return;
  }
  started = true;

  // 09:00 thu Hai hang tuan: day bao cao tuan
  cron.schedule(
    "0 9 * * 1",
    () =>
      runWithFailureAudit(
        "Day bao cao tuan",
        "WEEKLY_REPORT_PUSH_FAILED_CRON",
        () => runWeeklyReportPush(null)
      ),
    { timezone: TIMEZONE }
  );

  // 09:00 hang ngay: quet luu tru qua han
  cron.schedule(
    "0 9 * * *",
    () =>
      runWithFailureAudit(
        "Quet luu tre qua han",
        "ARCHIVE_OVERDUE_SCAN_FAILED_CRON",
        () => scanArchiveOverdue()
      ),
    { timezone: TIMEZONE }
  );

  // 03:00 hang ngay: don dep AuditLog qua N ngay (mac dinh 365 ngay, ghi de bang AUDIT_RETENTION_DAYS)
  cron.schedule(
    "0 3 * * *",
    () =>
      runWithFailureAudit(
        "Don dep AuditLog",
        "AUDIT_CLEANUP_FAILED_CRON",
        () => runAuditCleanup()
      ),
    { timezone: TIMEZONE }
  );

  // v0.27: 09:00 hang ngay quet cac muc thoi han den han (T-3/T-1/T/T+1 bon muc), gui DEADLINE_REMINDER
  cron.schedule(
    "0 9 * * *",
    () =>
      runWithFailureAudit(
        "Quet nhac nho han",
        "DUE_REMINDER_SCAN_FAILED_CRON",
        () => scanDueReminders()
      ),
    { timezone: TIMEZONE }
  );

  // 09:10 hang ngay: quet cac yeu cau dong dau da duyet nhung chua dien lai ban dong dau; khong nhac lai trong vong 3 ngay cua cung yeu cau
  cron.schedule(
    "10 9 * * *",
    () =>
      runWithFailureAudit(
        "Quet nhac dien lai ban dong dau",
        "SEAL_BACKFILL_REMINDER_SCAN_FAILED_CRON",
        () => scanSealBackfillReminders()
      ),
    { timezone: TIMEZONE }
  );

  console.log(
    "[cron] da dang ky 5 tac vu dinh ky (day bao cao tuan / quet luu tru qua han / don dep AuditLog / quet nhac nho han / quet nhac dien lai ban dong dau), mui gio Asia/Shanghai"
  );
}
