import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  weekPeriod,
  getLawyerWeeklyDigest,
  formatWeeklyDigestContent,
  type LawyerWeeklyDigest
} from "@/server/reports/weekly";
import { prisma } from "@/lib/prisma";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    matter: {
      count: vi.fn()
    },
    feeEntry: {
      aggregate: vi.fn()
    }
  }
}));

describe("weekPeriod", () => {
  it("computes Monday correctly for a Wednesday", () => {
    const now = new Date(2024, 5, 12); // Wednesday June 12, 2024
    const period = weekPeriod(now);
    expect(period.start).toEqual(new Date(2024, 5, 10)); // Monday
    expect(period.end).toEqual(new Date(2024, 5, 17)); // next Monday
  });

  it("computes Monday correctly for a Sunday", () => {
    const now = new Date(2024, 5, 9); // Sunday June 9, 2024
    const period = weekPeriod(now);
    expect(period.start).toEqual(new Date(2024, 5, 3)); // Monday June 3
    expect(period.end).toEqual(new Date(2024, 5, 10));
  });

  it("computes Monday correctly for a Monday", () => {
    const now = new Date(2024, 5, 10); // Monday
    const period = weekPeriod(now);
    expect(period.start).toEqual(new Date(2024, 5, 10));
    expect(period.end).toEqual(new Date(2024, 5, 17));
  });

  it("generates label in correct format", () => {
    const now = new Date(2024, 0, 15); // Wednesday
    const period = weekPeriod(now);
    // Monday should be Jan 15? Actually 2024-01-15 is Monday? Let's just check format
    expect(period.label).toMatch(/^\d{4}-\d{2}-\d{2} ~ \d{4}-\d{2}-\d{2}$/);
    expect(period.label).toContain("~");
  });
});

describe("getLawyerWeeklyDigest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches all counts correctly", async () => {
    (prisma.matter.count as any).mockImplementation(({ where }) => {
      if (where.createdAt) return 5;
      if (where.closedAt) return 3;
      if (where.archivedAt) return 2;
      return 0;
    });
    (prisma.feeEntry.aggregate as any).mockResolvedValue({
      _sum: { amount: 1234.56 }
    });

    const result = await getLawyerWeeklyDigest({
      userId: "u1",
      userName: "Alice"
    });

    expect(result.newIntake).toBe(5);
    expect(result.closed).toBe(3);
    expect(result.archived).toBe(2);
    expect(result.receivedAmount).toBeCloseTo(1234.56);
    expect(result.userId).toBe("u1");
    expect(result.userName).toBe("Alice");
  });

  it("handles zero fee sum", async () => {
    (prisma.matter.count as any).mockReturnValue(0);
    (prisma.feeEntry.aggregate as any).mockResolvedValue({ _sum: {} });

    const result = await getLawyerWeeklyDigest({
      userId: "u2",
      userName: "Bob"
    });

    expect(result.receivedAmount).toBe(0);
  });

  it("uses provided period", async () => {
    const customPeriod = {
      label: "Custom",
      start: new Date("2024-01-01"),
      end: new Date("2024-01-08")
    };
    (prisma.matter.count as any).mockResolvedValue(1);
    (prisma.feeEntry.aggregate as any).mockResolvedValue({ _sum: { amount: 100 } });

    await getLawyerWeeklyDigest({
      userId: "u3",
      userName: "Carol",
      period: customPeriod
    });

    // Verify that queries used custom period
    const calls = (prisma.matter.count as any).mock.calls;
    expect(calls[0][0].where.createdAt).toEqual({ gte: customPeriod.start, lt: customPeriod.end });
  });
});

describe("formatWeeklyDigestContent", () => {
  it("formats digest with all fields", () => {
    const digest: LawyerWeeklyDigest = {
      userId: "u1",
      userName: "Alice",
      period: { label: "Week", start: new Date(), end: new Date() },
      newIntake: 3,
      closed: 2,
      archived: 1,
      receivedAmount: 1234.56
    };
    const text = formatWeeklyDigestContent(digest);
    expect(text).toContain("新收 3 件");
    expect(text).toContain("已结 2 件");
    expect(text).toContain("已归档 1 件");
    expect(text).toContain("收款 1,234.56 元");
  });

  it("formats with zero amounts", () => {
    const digest: LawyerWeeklyDigest = {
      userId: "u1",
      userName: "Bob",
      period: { label: "Week", start: new Date(), end: new Date() },
      newIntake: 0,
      closed: 0,
      archived: 0,
      receivedAmount: 0
    };
    const text = formatWeeklyDigestContent(digest);
    expect(text).toBe("新收 0 件 · 已结 0 件 · 已归档 0 件 · 收款 0.00 元");
  });

  it("formats large numbers with locale", () => {
    const digest: LawyerWeeklyDigest = {
      userId: "u1",
      userName: "Carol",
      period: { label: "Week", start: new Date(), end: new Date() },
      newIntake: 0,
      closed: 0,
      archived: 0,
      receivedAmount: 1234567.89
    };
    const text = formatWeeklyDigestContent(digest);
    // Vietnamese/zh-CN locale uses comma as thousand sep
    expect(text).toContain("1,234,567.89");
  });
});
