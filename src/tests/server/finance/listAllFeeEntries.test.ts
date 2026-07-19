// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { listAllFeeEntries } from "@/server/finance/actions";
import { requireSession } from "@/lib/auth/session";
import { matterVisibilityFilter } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/permissions");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    feeEntry: {
      findMany: vi.fn(),
    },
  },
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockMatterVisibilityFilter = vi.mocked(matterVisibilityFilter, true);
const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "c000000000000000000000001", role: "LAWYER", organizationId: "org1" },
  } as any);
  mockMatterVisibilityFilter.mockReturnValue({ organizationId: "org1" });
});

const CUID = (n: number) => `c${n.toString().padStart(24, "0")}`;

describe("listAllFeeEntries", () => {
  it("admin returns all entries with includes and default limit 100", async () => {
    mockRequireSession.mockResolvedValue({
      user: { id: CUID(1), role: "ADMIN", organizationId: "org1" },
    } as any);
    const entries = [
      {
        id: CUID(10),
        type: "RECEIVED",
        amount: { toNumber: () => 100 } as any,
        matter: { id: CUID(2), internalCode: "IN-001", title: "Matter A" },
        beneficiaryUser: { id: CUID(20), name: "Ben" },
        recordedBy: { id: CUID(30), name: "Rec" },
      },
    ] as any;
    mockPrisma.feeEntry.findMany.mockResolvedValue(entries);

    const result = await listAllFeeEntries({});

    expect(mockPrisma.feeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          matter: { deletedAt: null, organizationId: "org1" },
        }),
        orderBy: { occurredAt: "desc" },
        take: 100,
        include: {
          matter: { select: { id: true, internalCode: true, title: true } },
          beneficiaryUser: { select: { id: true, name: true } },
          recordedBy: { select: { id: true, name: true } },
        },
      })
    );
    expect(result).toEqual(entries);
  });

  it("filters by type when provided", async () => {
    mockRequireSession.mockResolvedValue({
      user: { id: CUID(1), role: "LAWYER", organizationId: "org1" },
    } as any);
    const entries = [{ id: CUID(10), type: "RECEIVED" }] as any;
    mockPrisma.feeEntry.findMany.mockResolvedValue(entries);

    await listAllFeeEntries({ type: "RECEIVED" });

    expect(mockPrisma.feeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: "RECEIVED",
          matter: { deletedAt: null, organizationId: "org1" },
        }),
      })
    );
  });

  it("respects custom limit", async () => {
    mockRequireSession.mockResolvedValue({
      user: { id: CUID(1), role: "LAWYER", organizationId: "org1" },
    } as any);
    mockPrisma.feeEntry.findMany.mockResolvedValue([]);

    await listAllFeeEntries({ limit: 10 });

    expect(mockPrisma.feeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      })
    );
  });

  it("applies visibility filter for lawyer role", async () => {
    mockRequireSession.mockResolvedValue({
      user: { id: CUID(1), role: "LAWYER", organizationId: "org1" },
    } as any);
    mockMatterVisibilityFilter.mockReturnValue({ organizationId: "org1", accessLevel: "MEMBER" });
    mockPrisma.feeEntry.findMany.mockResolvedValue([]);

    await listAllFeeEntries({});

    expect(mockPrisma.feeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          matter: {
            deletedAt: null,
            organizationId: "org1",
            accessLevel: "MEMBER",
          },
        }),
      })
    );
  });

  it("propagates prisma errors", async () => {
    mockRequireSession.mockResolvedValue({
      user: { id: CUID(1), role: "LAWYER", organizationId: "org1" },
    } as any);
    const mockError = new Error("DB failure");
    mockPrisma.feeEntry.findMany.mockRejectedValue(mockError);

    await expect(listAllFeeEntries({})).rejects.toThrow("DB failure");
  });

});
