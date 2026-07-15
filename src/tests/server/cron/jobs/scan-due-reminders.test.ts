import { vi, describe, it, expect, beforeEach } from "vitest";
import { scanDueReminders } from "@/server/cron/jobs/scan-due-reminders";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/server/notifications/create";
import { audit } from "@/server/audit";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    deadline: { findMany: vi.fn() },
    hearing: { findMany: vi.fn() },
    notification: { findFirst: vi.fn() },
    $transaction: vi.fn()
  }
}));
vi.mock("@/server/notifications/create", () => ({
  createNotification: vi.fn().mockResolvedValue({})
}));
vi.mock("@/server/audit", () => ({
  audit: vi.fn()
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.deadline.findMany).mockResolvedValue([]);
  vi.mocked(prisma.hearing.findMany).mockResolvedValue([]);
  vi.mocked(prisma.notification.findFirst).mockResolvedValue(null);
});

describe("scanDueReminders", () => {
  it("executes and calls audit when no items", async () => {
    await scanDueReminders();
    expect(audit).toHaveBeenCalledWith({
      userId: null,
      action: "DUE_REMINDER_SCAN_CRON",
      targetType: "Report",
      targetId: "due-reminder",
      detail: expect.any(Object)
    });
  });

  it("creates notification for a deadline with proper shape", async () => {
    const now = new Date();
    vi.mocked(prisma.deadline.findMany).mockResolvedValue([
      {
        id: "d1",
        title: "Test deadline",
        dueAt: now,
        procedure: {
          matter: {
            id: "m1",
            title: "Matter",
            internalCode: "INT-001",
            ownerId: "u1"
          }
        }
      } as any
    ]);
    await scanDueReminders();
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        type: "DEADLINE_REMINDER"
      })
    );
  });
});
