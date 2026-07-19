// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMatterFinance } from "@/server/finance/actions";
import { requireSession } from "@/lib/auth/session";
import { assertCanAccessMatter } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/permissions");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    billing: { findMany: vi.fn() },
    feeEntry: { findMany: vi.fn() },
    commissionPlan: { findMany: vi.fn() },
    invoiceRequest: { findMany: vi.fn() },
  },
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockAssertCanAccessMatter = vi.mocked(assertCanAccessMatter, true);
const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
  mockAssertCanAccessMatter.mockResolvedValue(undefined);
});

describe("getMatterFinance", () => {
  it("returns empty stats when no data", async () => {
    mockPrisma.billing.findMany.mockResolvedValue([]);
    mockPrisma.feeEntry.findMany.mockResolvedValue([]);
    mockPrisma.commissionPlan.findMany.mockResolvedValue([]);
    mockPrisma.invoiceRequest.findMany.mockResolvedValue([]);

    const result = await getMatterFinance("m1");

    expect(result).toEqual({
      billings: [],
      entries: [],
      plans: [],
      stats: {
        contractAmount: 0,
        receivable: 0,
        received: 0,
        refund: 0,
        cost: 0,
        commission: 0,
        invoiced: 0,
      },
    });
  });

  it("calculates stats correctly with mixed data", async () => {
    mockPrisma.billing.findMany.mockResolvedValue([
      { id: "b1", contractAmount: new Prisma.Decimal(1000) },
      { id: "b2", contractAmount: new Prisma.Decimal(2000) },
    ]);
    mockPrisma.feeEntry.findMany.mockResolvedValue([
      { id: "e1", type: "RECEIVABLE", amount: new Prisma.Decimal(500) },
      { id: "e2", type: "RECEIVED", amount: new Prisma.Decimal(300) },
      { id: "e3", type: "COST", amount: new Prisma.Decimal(100) },
    ]);
    mockPrisma.commissionPlan.findMany.mockResolvedValue([]);
    mockPrisma.invoiceRequest.findMany.mockResolvedValue([
      { id: "i1", amount: new Prisma.Decimal(800) },
    ]);

    const result = await getMatterFinance("m1");

    expect(result.stats.contractAmount).toBe(3000);
    expect(result.stats.receivable).toBe(500);
    expect(result.stats.received).toBe(300);
    expect(result.stats.cost).toBe(100);
    expect(result.stats.commission).toBe(0);
    expect(result.stats.invoiced).toBe(800);
  });

  it("handles null/undefined amounts gracefully", async () => {
    mockPrisma.billing.findMany.mockResolvedValue([
      { id: "b1", contractAmount: null },
    ]);
    mockPrisma.feeEntry.findMany.mockResolvedValue([
      { id: "e1", type: "RECEIVABLE", amount: null },
    ]);
    mockPrisma.commissionPlan.findMany.mockResolvedValue([]);
    mockPrisma.invoiceRequest.findMany.mockResolvedValue([
      { id: "i1", amount: null },
    ]);

    const result = await getMatterFinance("m1");

    expect(result.stats.contractAmount).toBe(0);
    expect(result.stats.receivable).toBe(0);
    expect(result.stats.invoiced).toBe(0);
  });

  it("propagates permission error", async () => {
    mockAssertCanAccessMatter.mockRejectedValue(new Error("Forbidden"));
    await expect(getMatterFinance("m1")).rejects.toThrow("Forbidden");
  });

  it("propagates prisma errors", async () => {
    mockPrisma.billing.findMany.mockRejectedValue(new Error("DB error"));
    await expect(getMatterFinance("m1")).rejects.toThrow("DB error");
  });
});
