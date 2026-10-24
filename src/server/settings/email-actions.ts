/*
 * Server action gửi email kiểm tra cấu hình SMTP (TD-F1, PRD quyết định #21).
 * Không hard-code thông tin đăng nhập; chỉ quản lý dùng được.
 */

"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { isManager } from "@/lib/permissions";
import { sendMail, isEmailConfigured } from "@/server/email/mailer";

const sendTestSchema = z.object({ to: z.string().email("Email không hợp lệ") });

export type SendTestResult = { ok: boolean; skipped: boolean };

export async function sendTestEmail(input: { to: string }): Promise<SendTestResult> {
  const session = await requireSession();
  if (!isManager(session.user.role)) {
    throw new Error("Chỉ quản lý (ADMIN/PRINCIPAL_LAWYER) gửi email kiểm tra");
  }
  const { to } = sendTestSchema.parse(input);
  if (!isEmailConfigured()) return { ok: false, skipped: true };

  await sendMail({ to, template: "test-email", variables: {} });
  return { ok: true, skipped: false };
}
