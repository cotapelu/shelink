// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPersonalRevenue } from "@/server/finance/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { isManager } from "@/lib/permissions";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    feeEntry: {
      aggregate: vi.fn()
    }
  }
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/permissions", () => ({ isManager: vi.fn() }));

const mockRequireSession = vi.mocked(requireSession, true);
const mockPrisma = vi.mocked(prisma, true);
const mockIsManager = vi.mocked(isManager, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockIsManager.mockReturnValue(false);
});

describe("getPersonalRevenue", () => {
  it("returns monthly and yearly commission sums", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } } as any);
    vi.mocked(prisma.feeEntry.aggregate).mockResolvedValue({ _sum: { amount: 1500 } } as any);

    const result = await getPersonalRevenue("u1");

    expect(result).toEqual({ monthlyCommission: 1500, yearlyCommission: 1500 });
    expect(prisma.feeEntry.aggregate).toHaveBeenCalledTimes(2);
  });

  it("throws when user tries to access another user's revenue without manager role", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } } as any);
    mockIsManager.mockReturnValue(false);

    await expect(getPersonalRevenue("u2")).rejects.toThrow("只能查看自己的收入数据");
  });

  it("allows manager to view any user's revenue", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "MANAGER" } } as any);
    mockIsManager.mockReturnValue(true);
    vi.mocked(prisma.feeEntry.aggregate).mockResolvedValue({ _sum: { amount: 2000 } } as any);

    const result = await getPersonalRevenue("u2");

    expect(result).toEqual({ monthlyCommission: 2000, yearlyCommission: 2000 });
    expect(prisma.feeEntry.aggregate).toHaveBeenCalledTimes(2);
  });

  it("handles null sum from aggregate", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } } as any);
    vi.mocked(prisma.feeEntry.aggregate).mockResolvedValue({ _sum: { amount: null } } as any);

    const result = await getPersonalRevenue("u1");

    expect(result).toEqual({ monthlyCommission: 0, yearlyCommission: 0 });
  });

  it("propagates prisma errors", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } } as any);
    const mockError = new Error("DB failure");
    vi.mocked(prisma.feeEntry.aggregate).mockRejectedValue(mockError);

    await expect(getPersonalRevenue("u1")).rejects.toThrow("DB failure");
  });
});
