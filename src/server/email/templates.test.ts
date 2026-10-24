import { describe, it, expect, afterEach, vi } from "vitest";
import { renderTemplate } from "./templates";
import { isEmailConfigured } from "./mailer";

describe("renderTemplate", () => {
  it("renders the test-email template", () => {
    const { subject, html } = renderTemplate("test-email", {});
    expect(subject).toContain("Shelink");
    expect(html).toContain("Shelink");
  });

  it("replaces placeholders for deadline-reminder", () => {
    const { subject, html } = renderTemplate("deadline-reminder", {
      title: "Nộp chứng cứ",
      dueDate: "2026-11-01",
      categoryLabel: "Bằng chứng",
      matterTitle: "LL-2026-CC-0001",
      note: "Gấp"
    });
    expect(subject).toContain("Nộp chứng cứ");
    expect(subject).toContain("2026-11-01");
    expect(html).toContain("LL-2026-CC-0001");
  });

  it("throws on unknown key", () => {
    expect(() => renderTemplate("unknown" as never, {})).toThrow(/mẫu không tồn tại/);
  });
});

describe("isEmailConfigured", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("false when SMTP_HOST or SMTP_FROM missing", () => {
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_FROM", "");
    expect(isEmailConfigured()).toBe(false);
  });

  it("true when SMTP_HOST and SMTP_FROM present", () => {
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_FROM", "no-reply@example.com");
    expect(isEmailConfigured()).toBe(true);
  });
});
