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
});
