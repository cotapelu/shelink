// @ts-nocheck
/**
 * Test sendTestEmail: phân quyền (chỉ quản lý), bỏ qua khi chưa cấu hình SMTP, gửi thật khi đã cấu hình.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendTestEmail } from "./email-actions";
import { isEmailConfigured, sendMail } from "@/server/email/mailer";
import { getServerSession } from "next-auth";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/server/email/mailer", () => ({
  isEmailConfigured: vi.fn(),
  sendMail: vi.fn().mockResolvedValue(undefined)
}));

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
});

describe("sendTestEmail", () => {
  it("rejects non-manager roles", async () => {
    getServerSession.mockResolvedValue({ user: { id: "u2", role: "FINANCE" } });
    await expect(sendTestEmail({ to: "a@b.com" })).rejects.toThrow(/quản lý/i);
  });

  it("returns skipped when SMTP not configured", async () => {
    isEmailConfigured.mockReturnValue(false);
    const res = await sendTestEmail({ to: "a@b.com" });
    expect(res).toEqual({ ok: false, skipped: true });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends mail with test-email template when configured", async () => {
    isEmailConfigured.mockReturnValue(true);
    const res = await sendTestEmail({ to: "a@b.com" });
    expect(res).toEqual({ ok: true, skipped: false });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "a@b.com", template: "test-email" }));
  });

  it("rejects invalid email", async () => {
    isEmailConfigured.mockReturnValue(true);
    await expect(sendTestEmail({ to: "khong-phai-email" })).rejects.toThrow();
  });
});
