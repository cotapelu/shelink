// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMonthlyRevenue } from "@/server/finance/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    feeEntry: {
      findMany: vi.fn()
    }
  }
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

// Helper to create date at first day of month
const firstDayOf = (year: number, month: number) => new Date(year, month, 1);

describe("getMonthlyRevenue", () => {
  it("returns array of monthly buckets", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { organizationId: "org1" } as any });
    vi.mocked(prisma.feeEntry.findMany).mockResolvedValue([]);

    const result = await getMonthlyRevenue(3);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
    result.forEach(item => {
      expect(item).toHaveProperty("month");
      expect(item).toHaveProperty("received");
      expect(item).toHaveProperty("receivable");
    });
  });

  it("processes RECEIVED and RECEIVABLE entries in current month", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { organizationId: "org1" } as any });
    const now = new Date();
    const mockEntries = [
      { type: "RECEIVED", amount: 1000, occurredAt: new Date(now.getFullYear(), now.getMonth(), 10) },
      { type: "RECEIVABLE", amount: 2000, occurredAt: new Date(now.getFullYear(), now.getMonth(), 15) }
    ] as any;
    vi.mocked(prisma.feeEntry.findMany).mockResolvedValue(mockEntries);

    const result = await getMonthlyRevenue(3);

    const hasData = result.some(r => r.received > 0 || r.receivable > 0);
    expect(hasData).toBe(true);
  });

  it("distributes entries across multiple months correctly", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { organizationId: "org1" } as any });
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // zero-indexed
    // getMonthlyRevenue(3) uses start = current month - (3-1) = month-2
    // Buckets: [month-2, month-1, month]
    const mockEntries = [
      { type: "RECEIVED", amount: 500, occurredAt: firstDayOf(year, month - 2) }, // should go to bucket 0
      { type: "RECEIVABLE", amount: 1500, occurredAt: firstDayOf(year, month - 1) }, // bucket 1
      { type: "RECEIVED", amount: 2000, occurredAt: firstDayOf(year, month) }       // bucket 2
    ] as any;
    vi.mocked(prisma.feeEntry.findMany).mockResolvedValue(mockEntries);

    const result = await getMonthlyRevenue(3);
    expect(result).toHaveLength(3);
    expect(result[0].received).toBe(500);
    expect(result[1].receivable).toBe(1500);
    expect(result[2].received).toBe(2000);
  });

  it("ignores entries with types other than RECEIVED or RECEIVABLE", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { organizationId: "org1" } as any });
    const now = new Date();
    const mockEntries = [
      { type: "REFUND", amount: 300, occurredAt: new Date(now.getFullYear(), now.getMonth(), 10) },
      { type: "COST", amount: 200, occurredAt: new Date(now.getFullYear(), now.getMonth(), 15) },
      { type: "COMMISSION", amount: 100, occurredAt: new Date(now.getFullYear(), now.getMonth(), 20) }
    ] as any;
    vi.mocked(prisma.feeEntry.findMany).mockResolvedValue(mockEntries);

    const result = await getMonthlyRevenue(3);

    // All buckets should have zero because types ignored
    result.forEach(item => {
      expect(item.received).toBe(0);
      expect(item.receivable).toBe(0);
    });
  });

  it("handles months=1 correctly (single bucket)", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { organizationId: "org1" } as any });
    const now = new Date();
    const mockEntries = [
      { type: "RECEIVED", amount: 1234, occurredAt: new Date(now.getFullYear(), now.getMonth(), 5) }
    ] as any;
    vi.mocked(prisma.feeEntry.findMany).mockResolvedValue(mockEntries);

    const result = await getMonthlyRevenue(1);
    expect(result).toHaveLength(1);
    expect(result[0].received).toBe(1234);
  });

  it("handles prisma error by propagating", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { organizationId: "org1" } as any });
    const mockError = new Error("DB error");
    vi.mocked(prisma.feeEntry.findMany).mockRejectedValue(mockError);

    await expect(getMonthlyRevenue(6)).rejects.toThrow("DB error");
  });

  it("handles requireSession error by propagating", async () => {
    const mockError = new Error("Unauthorized");
    vi.mocked(requireSession).mockRejectedValue(mockError);

    await expect(getMonthlyRevenue(6)).rejects.toThrow("Unauthorized");
  });
});
