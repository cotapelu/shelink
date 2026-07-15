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

  it("processes entries", async () => {
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
});
