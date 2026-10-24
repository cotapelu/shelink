/*
 * Trang Email giao dịch (TD-F1). Cấu hình đọc từ biến môi trường; chỉ quản lý truy cập.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isManager } from "@/lib/permissions";
import { isEmailConfigured } from "@/server/email/mailer";
import { EmailSettingsForm, type EmailConfig } from "./_components/email-settings-form";

export default async function EmailSettingsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!isManager(session.user.role)) redirect("/settings/profile");

  const config: EmailConfig = {
    configured: isEmailConfigured(),
    host: process.env.SMTP_HOST ?? null,
    port: process.env.SMTP_PORT ?? null,
    from: process.env.SMTP_FROM ?? null,
    secure: process.env.SMTP_SECURE === "true",
    hasAuth: Boolean(process.env.SMTP_USER)
  };

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold">Email giao dịch</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Gửi mail SMTP cho nhắc hạn, mời user, đặt lại mật khẩu… Cấu hình bằng biến môi trường
          (SMTP_HOST/PORT/USER/PASS/FROM).
        </p>
      </header>
      <EmailSettingsForm config={config} />
    </div>
  );
}
