// @ts-nocheck
/**
 * Test module Chi phí: payExpense sinh FeeEntry COST trong cùng transaction,
 * chỉ cho chi phiếu đã duyệt, và phân quyền STAFF không xem phiếu người khác.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { payExpense, approveExpense, listExpenses } from "./actions";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    expenseClaim: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    feeEntry: { create: vi.fn() }
  }
}));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/audit", () => ({ audit: vi.fn() }));

const mockPrisma = vi.mocked(prisma, true);
const CID = "c" + "0".repeat(24);
const ACC = "c" + "1".repeat(24);
const AMOUNT = { toString: () => "1500" };

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
  mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
});

describe("payExpense", () => {
  it("creates a COST FeeEntry when the claim is linked to a matter", async () => {
    mockPrisma.expenseClaim.findUnique.mockResolvedValue({
      id: CID,
      status: "APPROVED",
      deletedAt: null,
      matterId: "m1",
      amount: AMOUNT,
      vendor: "Nhà in",
      title: "In hồ sơ",
      code: "EXP-2026-0001"
    });

    await payExpense({ id: CID, cashAccountId: ACC });

    expect(mockPrisma.expenseClaim.update.mock.calls[0][0].data.status).toBe("PAID");
    const fee = mockPrisma.feeEntry.create.mock.calls[0][0].data;
    expect(fee.type).toBe("COST");
    expect(fee.matterId).toBe("m1");
    expect(fee.accountId).toBe(ACC);
    expect(fee.recordedById).toBe("u1");
  });

  it("does not create a FeeEntry when the claim has no matter", async () => {
    mockPrisma.expenseClaim.findUnique.mockResolvedValue({
      id: CID, status: "APPROVED", deletedAt: null, matterId: null, amount: AMOUNT, code: "EXP-2026-0002"
    });

    await payExpense({ id: CID });

    expect(mockPrisma.feeEntry.create).not.toHaveBeenCalled();
  });

  it("refuses paying a claim that is not APPROVED", async () => {
    mockPrisma.expenseClaim.findUnique.mockResolvedValue({
      id: CID, status: "SUBMITTED", deletedAt: null, matterId: null, amount: AMOUNT
    });
    await expect(payExpense({ id: CID })).rejects.toThrow(/đã duyệt/);
  });
});

describe("approveExpense", () => {
  it("rejects non-manager roles", async () => {
    getServerSession.mockResolvedValue({ user: { id: "u2", role: "STAFF" } });
    mockPrisma.expenseClaim.findUnique.mockResolvedValue({ id: CID, status: "SUBMITTED", deletedAt: null });
    await expect(approveExpense(CID)).rejects.toThrow();
  });
});

describe("listExpenses", () => {
  it("scopes non-manager users to their own claims", async () => {
    getServerSession.mockResolvedValue({ user: { id: "u2", role: "STAFF" } });
    mockPrisma.$transaction.mockImplementation((ops: any) => Promise.all(ops));
    mockPrisma.expenseClaim.findMany.mockResolvedValue([]);
    mockPrisma.expenseClaim.count.mockResolvedValue(0);

    await listExpenses({});

    const where = mockPrisma.expenseClaim.findMany.mock.calls[0][0].where;
    expect(where.claimantUserId).toBe("u2");
  });
});
