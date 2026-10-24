// @ts-nocheck
/**
 * Test getReceivablesAging: gộp theo matter, chỉ giữ còn nợ, nối meta, tổng outstanding.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { getReceivablesAging } from "./actions";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

const DAY = 86400000;

vi.mock("@/lib/prisma", () => ({ prisma: { feeEntry: { findMany: vi.fn() } } }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/audit", () => ({ audit: vi.fn() }));

const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
});

describe("getReceivablesAging", () => {
  it("aggregates outstanding per matter, sorts by age, joins matter meta", async () => {
    const now = Date.now();
    mockPrisma.feeEntry.findMany.mockResolvedValue([
      { matterId: "m1", type: "RECEIVABLE", amount: new Prisma.Decimal(1000), occurredAt: new Date(now - 200 * DAY), matter: { internalCode: "LL-2026-CC-0001", title: "Vụ A", primaryClient: { name: "Công ty A" } } },
      { matterId: "m1", type: "RECEIVED", amount: new Prisma.Decimal(400), occurredAt: new Date(now - 150 * DAY), matter: { internalCode: "LL-2026-CC-0001", title: "Vụ A", primaryClient: { name: "Công ty A" } } },
      { matterId: "m2", type: "RECEIVABLE", amount: new Prisma.Decimal(500), occurredAt: new Date(now - 10 * DAY), matter: { internalCode: "LL-2026-SP-0002", title: "Dự án B", primaryClient: null } },
      { matterId: "m3", type: "RECEIVABLE", amount: new Prisma.Decimal(300), occurredAt: new Date(now - 90 * DAY), matter: { internalCode: "LL-2026-CC-0003", title: "Vụ C", primaryClient: { name: "Khách C" } } },
      { matterId: "m3", type: "RECEIVED", amount: new Prisma.Decimal(300), occurredAt: new Date(now - 80 * DAY), matter: { internalCode: "LL-2026-CC-0003", title: "Vụ C", primaryClient: { name: "Khách C" } } }
    ]);

    const result = await getReceivablesAging(now);

    expect(mockPrisma.feeEntry.findMany).toHaveBeenCalledTimes(1);
    expect(result.rows.map((r) => r.matterId)).toEqual(["m1", "m2"]); // m3 hết nợ
    expect(result.rows[0]).toMatchObject({ outstanding: 600, ageDays: 200, bucket: "b90plus", internalCode: "LL-2026-CC-0001", clientName: "Công ty A" });
    expect(result.rows[1]).toMatchObject({ outstanding: 500, bucket: "b0_30", clientName: null });
    expect(result.totalOutstanding).toBe(1100);
    expect(result.summary.find((s) => s.key === "b90plus").amount).toBe(600);
    expect(result.summary.find((s) => s.key === "b0_30").amount).toBe(500);
  });

  it("returns empty when no outstanding", async () => {
    const now = Date.now();
    mockPrisma.feeEntry.findMany.mockResolvedValue([
      { matterId: "m1", type: "RECEIVABLE", amount: new Prisma.Decimal(100), occurredAt: new Date(now - 5 * DAY), matter: { internalCode: "X", title: "T", primaryClient: null } },
      { matterId: "m1", type: "RECEIVED", amount: new Prisma.Decimal(100), occurredAt: new Date(now - 4 * DAY), matter: { internalCode: "X", title: "T", primaryClient: null } }
    ]);
    const result = await getReceivablesAging(now);
    expect(result.rows).toHaveLength(0);
    expect(result.totalOutstanding).toBe(0);
  });
});
