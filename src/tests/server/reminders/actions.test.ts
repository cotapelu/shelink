import { describe, it, expect, vi, beforeEach } from "vitest";
import { triggerDueReminderScan } from "@/server/reminders/actions";
import { requireSession } from "@/lib/auth/session";
import { scanDueReminders } from "@/server/cron/jobs/scan-due-reminders";

vi.mock("@/lib/auth/session");
vi.mock("@/server/cron/jobs/scan-due-reminders");

const mockRequireSession = vi.mocked(requireSession, true);
const mockScanDueReminders = vi.mocked(scanDueReminders, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("reminders/actions", () => {
  it("should allow ADMIN to trigger scan", async () => {
    mockRequireSession.mockResolvedValue({
      user: { id: "u1", role: "ADMIN" },
    } as any);
    mockScanDueReminders.mockResolvedValue({
      deadlineScanned: 5,
      deadlineNotified: 3,
      hearingScanned: 0,
      hearingNotified: 0,
      suppressed: 0,
    } as any);

    const result = await triggerDueReminderScan();

    expect(result).toEqual({
      deadlineScanned: 5,
      deadlineNotified: 3,
      hearingScanned: 0,
      hearingNotified: 0,
      suppressed: 0,
    });
    expect(mockScanDueReminders).toHaveBeenCalledTimes(1);
  });

  it("should allow PRINCIPAL_LAWYER to trigger scan", async () => {
    mockRequireSession.mockResolvedValue({
      user: { id: "u2", role: "PRINCIPAL_LAWYER" },
    } as any);
    mockScanDueReminders.mockResolvedValue({
      deadlineScanned: 2,
      deadlineNotified: 2,
      hearingScanned: 0,
      hearingNotified: 0,
      suppressed: 0,
    } as any);

    const result = await triggerDueReminderScan();

    expect(result.deadlineScanned).toBe(2);
    expect(result.deadlineNotified).toBe(2);
  });

  it("should reject LAWYER role", async () => {
    mockRequireSession.mockResolvedValue({
      user: { id: "u3", role: "LAWYER" },
    } as any);

    await expect(triggerDueReminderScan()).rejects.toThrow(
      "仅管理员 / 主任律师可手动触发到期提醒扫描"
    );
    expect(mockScanDueReminders).not.toHaveBeenCalled();
  });

  it("should reject ASSISTANT role", async () => {
    mockRequireSession.mockResolvedValue({
      user: { id: "u4", role: "ASSISTANT" },
    } as any);

    await expect(triggerDueReminderScan()).rejects.toThrow();
  });

  it("should reject unauthenticated (null session)", async () => {
    mockRequireSession.mockResolvedValue(null as any);

    await expect(triggerDueReminderScan()).rejects.toThrow();
  });
});
