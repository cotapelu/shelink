// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPersonalRevenue } from "@/server/finance/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    feeEntry: {
      aggregate: vi.fn()
    }
  }
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPersonalRevenue", () => {
  it("returns monthly and yearly commission sums", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: "u1", role: "LAWYER", avatar: null } } as any);
    vi.mocked(prisma.feeEntry.aggregate).mockResolvedValue({ _sum: { amount: 1500 } } as any);

    const result = await getPersonalRevenue("u1");

    expect(result).toEqual({ monthlyCommission: 1500, yearlyCommission: 1500 });
    expect(prisma.feeEntry.aggregate).toHaveBeenCalledTimes(2);
  });
});
