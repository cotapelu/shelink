// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import cuid from "cuid";
import { listMatters } from "@/server/matters/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { matterVisibilityFilter } from "@/lib/permissions";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    matter: {
      findMany: vi.fn(),
      count: vi.fn()
    }
  }
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/permissions", () => ({
  matterVisibilityFilter: vi.fn(() => ({})),
  matterAssociationFilter: vi.fn(() => ({}))
}));

const mockPrisma = vi.mocked(prisma, true);
const mockRequireSession = vi.mocked(requireSession);
const mockVisibilityFilter = vi.mocked(matterVisibilityFilter);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
  mockVisibilityFilter.mockReturnValue({});
});

describe("listMatters", () => {
  it("filters by category", async () => {
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);
    await listMatters({ category: "CIVIL_COMMERCIAL" });
    expect(mockPrisma.matter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([ expect.objectContaining({ category: "CIVIL_COMMERCIAL" }) ])
        })
      })
    );
  });

  it("filters by status", async () => {
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);
    await listMatters({ status: "IN_PROGRESS" });
    expect(mockPrisma.matter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([ expect.objectContaining({ status: "IN_PROGRESS" }) ])
        })
      })
    );
  });

  it("filters by ownerId", async () => {
    const ownerId = cuid();
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);
    await listMatters({ ownerId });
    expect(mockPrisma.matter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([ expect.objectContaining({ ownerId }) ])
        })
      })
    );
  });

  it("searches by title, internalCode, or client name", async () => {
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);
    await listMatters({ search: "contract" });
    const callArgs = mockPrisma.matter.findMany.mock.calls[0][0];
    const searchCondition = callArgs.where.AND?.find((cond: any) => cond.OR);
    expect(searchCondition).toBeDefined();
  });

  it("returns empty items when no matches", async () => {
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);
    const result = await listMatters({});
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("applies matterVisibilityFilter from permissions", async () => {
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);
    await listMatters({});
    expect(mockVisibilityFilter).toHaveBeenCalledWith("u1", "LAWYER");
  });

  // Additional edge case tests

  it("filters by intake date range", async () => {
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);
    const from = new Date("2025-01-01");
    const to = new Date("2025-12-31");
    await listMatters({ intakeDateFrom: from, intakeDateTo: to });
    const callArgs = mockPrisma.matter.findMany.mock.calls[0][0];
    const where = callArgs.where as any;
    const dateCond = where.AND?.find((c: any) => c.intakeDate);
    expect(dateCond).toBeDefined();
    expect(dateCond.intakeDate.gte).toEqual(from);
    expect(dateCond.intakeDate.lte).toEqual(to);
  });

  it("filters by statusIn array", async () => {
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);
    await listMatters({ statusIn: ["IN_PROGRESS", "CLOSED"] });
    const callArgs = mockPrisma.matter.findMany.mock.calls[0][0];
    const where = callArgs.where as any;
    const statusCond = where.AND?.find((c: any) => c.status && c.status.in);
    expect(statusCond).toBeDefined();
    expect(statusCond.status.in).toEqual(["IN_PROGRESS", "CLOSED"]);
  });

  it("filters by statusNotIn array", async () => {
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);
    await listMatters({ statusNotIn: ["ARCHIVED", "ON_HOLD"] });
    const callArgs = mockPrisma.matter.findMany.mock.calls[0][0];
    const where = callArgs.where as any;
    const statusCond = where.AND?.find((c: any) => c.status && c.status.notIn);
    expect(statusCond).toBeDefined();
    expect(statusCond.status.notIn).toEqual(["ARCHIVED", "ON_HOLD"]);
  });

  it("combines category, statusIn, and search filters", async () => {
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);
    await listMatters({ category: "CIVIL_COMMERCIAL", statusIn: ["IN_PROGRESS"], search: "contract" });
    const callArgs = mockPrisma.matter.findMany.mock.calls[0][0];
    const where = callArgs.where as any;
    const and = where.AND as any[];
    expect(and.some((c: any) => c.category === "CIVIL_COMMERCIAL")).toBe(true);
    expect(and.some((c: any) => c.status?.in?.includes("IN_PROGRESS") && c.status?.notIn === undefined)).toBe(true);
    expect(and.some((c: any) => c.OR)).toBe(true);
  });

  it("sorts by hearing date", async () => {
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);
    await listMatters({ sortBy: "hearing" });
    const callArgs = mockPrisma.matter.findMany.mock.calls[0][0];
    expect(callArgs.orderBy).toBeDefined();
  });

  it("sorts by claimAmount", async () => {
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);
    await listMatters({ sortBy: "claimAmount" });
    const callArgs = mockPrisma.matter.findMany.mock.calls[0][0];
    expect(callArgs.orderBy).toBeDefined();
  });

  it("sorts by hearing date with multiple procedures", async () => {
    const date1 = new Date("2025-01-01");
    const date2 = new Date("2025-02-01");
    mockPrisma.matter.findMany.mockResolvedValue([{
      id: "m1",
      procedures: [{ hearings: [{ startsAt: date1 }] }, { hearings: [{ startsAt: date2 }] }],
      updatedAt: new Date()
    }]);
    mockPrisma.matter.count.mockResolvedValue(1);

    const result = await listMatters({ sortBy: "hearing", sortDir: "asc" });
    expect(result.items).toHaveLength(1);
  });

  it("propagates prisma errors", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    const mockError = new Error("DB failure");
    mockPrisma.matter.findMany.mockRejectedValue(mockError);
    mockPrisma.matter.count.mockResolvedValue(0);

    await expect(listMatters({})).rejects.toThrow("DB failure");
  });

});
