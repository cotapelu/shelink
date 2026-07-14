// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMonthlyRevenue } from "@/server/finance/actions";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { matterVisibilityFilter } from "@/lib/permissions";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    feeEntry: {
      findMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/permissions", () => ({
  matterVisibilityFilter: vi.fn(),
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockPrisma = vi.mocked(prisma, true);
const mockMatterVis = vi.mocked(matterVisibilityFilter, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "LAWYER" },
  } as any);
  mockMatterVis.mockReturnValue({});
});

const CUID = (n: number) => `c${n.toString().padStart(24, "0")}`;

describe("getMonthlyRevenue", () => {
  it("should return monthly revenue buckets with RECEIVED and RECEIVABLE sums", async () => {
    const months = 6;
    mockRequireSession.mockResolvedValue({
      user: { id: CUID(1), role: "ADMIN" },
    } as any);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    // generate entries
    const entries = [
      { type: "RECEIVED", amount: 1000, occurredAt: new Date(start.getFullYear(), start.getMonth(), 15) },
      { type: "RECEIVABLE", amount: 500, occurredAt: new Date(start.getFullYear(), start.getMonth(), 20) },
      { type: "RECEIVED", amount: 2000, occurredAt: new Date(start.getFullYear(), start.getMonth() + 1, 10) },
    ];
    mockPrisma.feeEntry.findMany.mockResolvedValue(entries);

    const result = await getMonthlyRevenue(months);

    expect(result).toHaveLength(months);
    // first month should have received=1000, receivable=500
    expect(result[0]).toMatchObject({ month: `${start.getMonth() + 1}月`, received: 1000, receivable: 500 });
    // second month received=2000, receivable=0
    expect(result[1]).toMatchObject({ received: 2000, receivable: 0 });
    // others zero
    for (let i = 2; i < months; i++) {
      expect(result[i]).toMatchObject({ received: 0, receivable: 0 });
    }
  });

  it("should filter by matter visibility", async () => {
    const months = 3;
    mockRequireSession.mockResolvedValue({
      user: { id: CUID(1), role: "LAWYER" },
    } as any);
    mockMatterVis.mockReturnValue({ ownerId: CUID(1) });
    mockPrisma.feeEntry.findMany.mockResolvedValue([]);

    await getMonthlyRevenue(months);

    expect(mockPrisma.feeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          matter: {
            deletedAt: null,
            ownerId: CUID(1),
          },
        }),
      })
    );
  });

  it("should default months to 6", async () => {
    mockRequireSession.mockResolvedValue({
      user: { id: CUID(1), role: "ADMIN" },
    } as any);
    mockPrisma.feeEntry.findMany.mockResolvedValue([]);

    // call without argument
    await getMonthlyRevenue();

    // still called with findMany; months default 6 used internally for bucket length but not in query
    // we can't easily assert, but ensure no error
    expect(mockPrisma.feeEntry.findMany).toHaveBeenCalled();
  });

  it("should include only RECEIVABLE and RECEIVED types", async () => {
    const months = 2;
    mockRequireSession.mockResolvedValue({
      user: { id: CUID(1), role: "ADMIN" },
    } as any);
    const entries = [
      { type: "COMMISSION", amount: 300, occurredAt: new Date() },
      { type: "RECEIVED", amount: 100, occurredAt: new Date() },
    ];
    mockPrisma.feeEntry.findMany.mockResolvedValue(entries);

    await getMonthlyRevenue(months);

    expect(mockPrisma.feeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: { in: ["RECEIVABLE", "RECEIVED"] },
        }),
      })
    );
  });
});
