/**
 * Mẫu email giao dịch. Message key theo kiểu i18n-ready (GOAL §4.5):
 * nội dung dùng biến {{var}} thay vì nối chuỗi rải rác.
 */

export type EmailTemplateKey =
  | "deadline-reminder"
  | "quote-sent"
  | "contract-expiring"
  | "password-reset"
  | "account-invite"
  | "test-email";

interface TemplateDef {
  subject: string;
  html: string;
}

const LAYOUT = (title: string, body: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#0A0E1A;color:#E8ECF5;font-family:Inter,PingFang SC,-apple-system,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="font-size:12px;color:#9BA8C7;letter-spacing:.08em;text-transform:uppercase">Shelink</div>
<h1 style="font-size:20px;font-weight:600;margin:8px 0 16px">${title}</h1>
<div style="background:#111727;border:1px solid #2A3656;border-radius:8px;padding:20px;font-size:14px;line-height:1.6">
${body}
</div>
<p style="font-size:12px;color:#5B6889;margin-top:16px">Email tự động — vui lòng không trả lời.</p>
</div></body></html>`;

function fill(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? "");
}

export const EMAIL_TEMPLATES: Record<EmailTemplateKey, TemplateDef> = {
  "deadline-reminder": {
    subject: "Nhắc hạn: {{title}} đến hạn {{dueDate}}",
    html: LAYOUT(
      "Nhắc hạn công việc",
      `<p>Hạn <strong>{{title}}</strong> ({{categoryLabel}}) của <strong>{{matterTitle}}</strong> đến hạn ngày <strong>{{dueDate}}</strong>.</p>
<p>Ghi chép: {{note}}</p>`
    )
  },
  "quote-sent": {
    subject: "Báo giá {{code}} đã được gửi",
    html: LAYOUT(
      "Báo giá của bạn",
      `<p>Báo giá mã <strong>{{code}}</strong> — {{title}} đã được gửi tới quý khách.</p>
<p>Tổng giá trị: <strong>{{total}}</strong> ({{currency}}). Hiệu lực đến: {{expiresAt}}.</p>`
    )
  },
  "contract-expiring": {
    subject: "Hợp đồng {{code}} sắp hết hạn ({{daysLeft}} ngày)",
    html: LAYOUT(
      "Hợp đồng sắp hết hạn",
      `<p>Hợp đồng <strong>{{code}}</strong> — {{title}} với khách hàng <strong>{{clientName}}</strong> sẽ hết hạn ngày <strong>{{expiresAt}}</strong> (còn {{daysLeft}} ngày).</p>`
    )
  },
  "password-reset": {
    subject: "Đặt lại mật khẩu Shelink",
    html: LAYOUT(
      "Đặt lại mật khẩu",
      `<p>Bạn nhận được email này vì có yêu cầu đặt lại mật khẩu.</p>
<p>Nhấn vào liên kết sau để đặt lại (hiệu lực {{expireMinutes}} phút): <a href="{{resetUrl}}" style="color:#5B8DEF">{{resetUrl}}</a></p>
<p>Nếu không phải bạn, hãy bỏ qua email này.</p>`
    )
  },
  "account-invite": {
    subject: "Bạn được mời tham gia Shelink",
    html: LAYOUT(
      "Thư mời tham gia",
      `<p>Bạn được mời tham gia hệ thống quản trị Shelink với vai trò <strong>{{role}}</strong>.</p>
<p>Đăng nhập tại: <a href="{{loginUrl}}" style="color:#5B8DEF">{{loginUrl}}</a></p>`
    )
  },
  "test-email": {
    subject: "[Shelink] Email kiểm tra cấu hình",
    html: LAYOUT(
      "Email kiểm tra",
      `<p>Đây là email kiểm tra từ hệ thống quản trị <strong>Shelink</strong>.</p>
<p>Nếu bạn nhận được thư này, cấu hình SMTP đang hoạt động bình thường.</p>`
    )
  }
};

export function renderTemplate(
  key: EmailTemplateKey,
  variables: Record<string, string>
): { subject: string; html: string } {
  const def = EMAIL_TEMPLATES[key];
  if (!def) throw new Error(`[ERROR] Email Template - mẫu không tồn tại - key: ${key}`);
  return { subject: fill(def.subject, variables), html: fill(def.html, variables) };
}
