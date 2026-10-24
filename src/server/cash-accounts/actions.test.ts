// @ts-nocheck
/**
 * Test module Quỹ: pure balance helper + listCashAccountsWithBalance (groupBy, không N+1)
 * + phân quyền create/active (chỉ quản lý).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { createCashAccount, listCashAccountsWithBalance, setCashAccountActive } from "./actions";
import { cashBalance, netCashFlow, groupFlowsByAccount } from "./balance";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

const AID = "c" + "a".repeat(24);
const BID = "c" + "b".repeat(24);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cashAccount: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    feeEntry: { groupBy: vi.fn() }
  }
}));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/audit", () => ({ audit: vi.fn() }));

const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN", name: "Admin" } });
});

describe("balance helpers", () => {
  it("netCashFlow counts RECEIVED in and COST/REFUND out, ignores RECEIVABLE/COMMISSION", () => {
    const net = netCashFlow([
      { type: "RECEIVED", amount: 1000 },
      { type: "COST", amount: 300 },
      { type: "REFUND", amount: 200 },
      { type: "RECEIVABLE", amount: 9999 },
      { type: "COMMISSION", amount: 500 }
    ]);
    expect(net).toBe(500); // 1000 − 300 − 200
  });

  it("cashBalance = openingBalance + net, rounded to 2 decimals", () => {
    expect(cashBalance(2000, [{ type: "RECEIVED", amount: 150.204 }, { type: "COST", amount: 0.1 }])).toBe(2150.1);
  });

  it("groupFlowsByAccount groups by accountId", () => {
    const map = groupFlowsByAccount([
      { accountId: AID, type: "RECEIVED", amount: 100 },
      { accountId: AID, type: "COST", amount: 40 },
      { accountId: BID, type: "RECEIVED", amount: 70 }
    ]);
    expect(map.get(AID)).toHaveLength(2);
    expect(map.get(BID)).toEqual([{ type: "RECEIVED", amount: 70 }]);
  });
});

describe("listCashAccountsWithBalance", () => {
  it("computes balance per account from grouped flows", async () => {
    mockPrisma.cashAccount.findMany.mockResolvedValue([
      { id: AID, name: "Tiền mặt", openingBalance: new Prisma.Decimal(1000), active: true, type: "CASH", currency: "VND", bankName: null, accountNoMasked: null, note: null, createdAt: new Date(), updatedAt: new Date() },
      { id: BID, name: "Vietcombank", openingBalance: new Prisma.Decimal(5000), active: true, type: "BANK", currency: "VND", bankName: "VCB", accountNoMasked: "1234", note: null, createdAt: new Date(), updatedAt: new Date() }
    ]);
    mockPrisma.feeEntry.groupBy.mockResolvedValue([
      { accountId: AID, type: "RECEIVED", _sum: { amount: new Prisma.Decimal(500) } },
      { accountId: AID, type: "COST", _sum: { amount: new Prisma.Decimal(200) } },
      { accountId: AID, type: "RECEIVABLE", _sum: { amount: new Prisma.Decimal(99999) } },
      { accountId: BID, type: "REFUND", _sum: { amount: new Prisma.Decimal(300) } },
      { accountId: null, type: "RECEIVED", _sum: { amount: new Prisma.Decimal(10) } }
    ]);

    const rows = await listCashAccountsWithBalance();

    expect(mockPrisma.feeEntry.groupBy).toHaveBeenCalledTimes(1); // không N+1
    expect(rows.find((r) => r.id === AID).balance).toBe(1300); // 1000 + 500 − 200
    expect(rows.find((r) => r.id === BID).balance).toBe(4700); // 5000 − 300
  });

  it("rejects non-finance roles", async () => {
    getServerSession.mockResolvedValue({ user: { id: "u3", role: "LAWYER" } });
    await expect(listCashAccountsWithBalance()).rejects.toThrow(/kế toán|quản lý/i);
  });
});

describe("createCashAccount", () => {
  it("creates with Decimal opening balance and audits", async () => {
    mockPrisma.cashAccount.create.mockResolvedValue({ id: AID, name: "Quỹ test" });

    const created = await createCashAccount({
      name: "Quỹ test",
      type: "BANK",
      openingBalance: 2500000,
      bankName: "Techcombank",
      accountNoMasked: "9876"
    });

    expect(created.id).toBe(AID);
    const data = mockPrisma.cashAccount.create.mock.calls[0][0].data;
    expect(String(data.openingBalance)).toBe("2500000");
    expect(data.bankName).toBe("Techcombank");
  });

  it("rejects non-manager roles", async () => {
    getServerSession.mockResolvedValue({ user: { id: "u3", role: "FINANCE" } });
    await expect(createCashAccount({ name: "X", type: "CASH", openingBalance: 0 })).rejects.toThrow(/quản lý quỹ/i);
  });
});

describe("setCashAccountActive", () => {
  it("toggles active state", async () => {
    mockPrisma.cashAccount.update.mockResolvedValue({ id: AID, active: false });
    await setCashAccountActive(AID, false);
    expect(mockPrisma.cashAccount.update.mock.calls[0][0].data).toEqual({ active: false });
  });
});
