/**
 * Email giao dịch qua SMTP cấu hình bằng biến môi trường (PRD quyết định #21, TD-F1).
 * Không hard-code thông tin đăng nhập; log không chứa mật khẩu/PII.
 *
 * Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE
 */

import nodemailer, { type Transporter } from "nodemailer";
import type { EmailTemplateKey } from "./templates";
import { renderTemplate } from "./templates";

let transporter: Transporter | null = null;

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendMailInput {
  to: string;
  subject: string;
  template: EmailTemplateKey;
  variables: Record<string, string>;
  attachments?: MailAttachment[];
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function getTransporter(): Transporter {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const from = process.env.SMTP_FROM;
    if (!host || !from) {
      throw new Error("[ERROR] Email Send - SMTP chưa cấu hình - thiết lập SMTP_HOST và SMTP_FROM trong biến môi trường");
    }
    transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined
    });
  }
  return transporter;
}

/** Gửi mail; ném lỗi để caller quyết định retry/fallback (không nuốt lỗi). */
export async function sendMail(input: SendMailInput): Promise<void> {
  if (!isEmailConfigured()) {
    // Không cấu hình SMTP → bỏ qua im lặng là đúng cho môi trường dev, nhưng log WARN để dễ phát hiện
    console.warn("[WARN] Email Send - SMTP chưa cấu hình - bỏ qua gửi", { template: input.template });
    return;
  }
  const { subject, html } = renderTemplate(input.template, input.variables);
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to: input.to,
    subject,
    html,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType
    }))
  });
}
