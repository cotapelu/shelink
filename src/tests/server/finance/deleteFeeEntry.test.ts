// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteFeeEntry } from "@/server/finance/actions";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { assertMatterWritable } from "@/lib/archive/guard";
import { isManager } from "@/lib/permissions";

vi.mock("@/lib/auth/session");
vi.mock("@/server/audit");
vi.mock("next/cache");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    feeEntry: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/archive/guard", () => ({
  assertMatterWritable: vi.fn(),
}));
vi.mock("@/lib/permissions", () => ({
  isManager: vi.fn(),
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockAudit = vi.mocked(audit, true);
const mockRevalidatePath = vi.mocked(revalidatePath, true);
const mockPrisma = vi.mocked(prisma, true);
const mockAssertMatterWritable = vi.mocked(assertMatterWritable, true);
const mockIsManager = vi.mocked(isManager, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "LAWYER" },
  } as any);
  mockAssertMatterWritable.mockResolvedValue(undefined);
  mockIsManager.mockReturnValue(false);
});

const CUID = (n: number) => `c${n.toString().padStart(24, "0")}`;

describe("deleteFeeEntry", () => {
  it("should delete fee entry and cascade commission children", async () => {
    const feeId = CUID(1);
    const matterId = CUID(2);
    const entry = {
      id: feeId,
      matterId,
      amount: new Prisma.Decimal(100),
      commissionChildren: [{ id: CUID(3) }],
    };
    mockRequireSession.mockResolvedValue({
      user: { id: CUID(10), role: "FINANCE" },
    } as any);
    mockPrisma.feeEntry.findUnique.mockResolvedValue(entry as any);
    mockPrisma.feeEntry.deleteMany.mockResolvedValue({ count: 1 } as any);
    mockPrisma.feeEntry.delete.mockResolvedValue({} as any);
    mockPrisma.$transaction.mockImplementation(async (cb: any) => await cb(mockPrisma));

    const result = await deleteFeeEntry(feeId);

    expect(mockPrisma.feeEntry.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [CUID(3)] } },
    });
    expect(mockPrisma.feeEntry.delete).toHaveBeenCalledWith({
      where: { id: feeId },
    });
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "FEE_ENTRY_DELETE",
        targetType: "FeeEntry",
        targetId: feeId,
        detail: { matterId, cascadedChildren: 1 },
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${matterId}`);
    expect(result).toEqual({ ok: true });
  });

  it("should return {ok:false} if entry not found", async () => {
    mockRequireSession.mockResolvedValue({
      user: { id: CUID(1), role: "FINANCE" },
    } as any);
    mockPrisma.feeEntry.findUnique.mockResolvedValue(null);
    const result = await deleteFeeEntry("nonexistent");
    expect(result).toEqual({ ok: false });
  });

  it("should reject if user lacks permission", async () => {
    mockRequireSession.mockResolvedValue({
      user: { id: CUID(1), role: "LAWYER" },
    } as any);
    mockIsManager.mockReturnValue(false); // not manager, role not FINANCE
    const feeId = CUID(1);
    const entry = {
      id: feeId,
      matterId: CUID(2),
      commissionChildren: [],
    };
    mockPrisma.feeEntry.findUnique.mockResolvedValue(entry as any);
    await expect(deleteFeeEntry(feeId)).rejects.toThrow(
      "仅管理员、主办律师或财务可删除收付记录"
    );
  });
});
