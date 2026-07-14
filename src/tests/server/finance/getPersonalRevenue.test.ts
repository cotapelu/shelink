// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPersonalRevenue } from "@/server/finance/actions";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isManager } from "@/lib/permissions";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    feeEntry: {
      aggregate: vi.fn(),
    },
  },
}));
vi.mock("@/lib/permissions", () => ({
  isManager: vi.fn(),
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockPrisma = vi.mocked(prisma, true);
const mockIsManager = vi.mocked(isManager, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "LAWYER" },
  } as any);
  mockIsManager.mockReturnValue(false);
});

const CUID = (n: number) => `c${n.toString().padStart(24, "0")}`;

describe("getPersonalRevenue", () => {
  it("should return monthly and yearly commission for self", async () => {
    const userId = CUID(1);
    mockRequireSession.mockResolvedValue({
      user: { id: userId, role: "LAWYER" },
    } as any);
    mockPrisma.feeEntry.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 5000 } })
      .mockResolvedValueOnce({ _sum: { amount: 30000 } });

    const result = await getPersonalRevenue(userId);

    expect(result).toEqual({
      monthlyCommission: 5000,
      yearlyCommission: 30000,
    });
    expect(mockPrisma.feeEntry.aggregate).toHaveBeenCalledTimes(2);
  });

  it("should allow manager to view other user's revenue", async () => {
    const targetUserId = CUID(2);
    mockRequireSession.mockResolvedValue({
      user: { id: CUID(1), role: "ADMIN" },
    } as any);
    mockIsManager.mockReturnValue(true);
    mockPrisma.feeEntry.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 1000 } })
      .mockResolvedValueOnce({ _sum: { amount: 12000 } });

    const result = await getPersonalRevenue(targetUserId);

    expect(result).toEqual({
      monthlyCommission: 1000,
      yearlyCommission: 12000,
    });
  });

  it("should reject non-manager viewing other user's revenue", async () => {
    const targetUserId = CUID(2);
    mockRequireSession.mockResolvedValue({
      user: { id: CUID(1), role: "LAWYER" },
    } as any);
    mockIsManager.mockReturnValue(false);

    await expect(getPersonalRevenue(targetUserId)).rejects.toThrow(
      "只能查看自己的收入数据"
    );
  });

  it("should return zero when no commission entries", async () => {
    const userId = CUID(1);
    mockRequireSession.mockResolvedValue({
      user: { id: userId, role: "LAWYER" },
    } as any);
    mockPrisma.feeEntry.aggregate
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } });

    const result = await getPersonalRevenue(userId);

    expect(result).toEqual({
      monthlyCommission: 0,
      yearlyCommission: 0,
    });
  });
});
