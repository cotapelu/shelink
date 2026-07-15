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
  matterVisibilityFilter: vi.fn(() => ({}))
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
  const now = new Date();

  it("filters by category", async () => {
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);

    await listMatters({ category: "CIVIL_COMMERCIAL" });

    expect(mockPrisma.matter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ category: "CIVIL_COMMERCIAL" })
          ])
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
          AND: expect.arrayContaining([
            expect.objectContaining({ status: "IN_PROGRESS" })
          ])
        })
      })
    );
  });

  it("filters by statusIn array", async () => {
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);

    await listMatters({ statusIn: ["IN_PROGRESS", "PENDING_ACCEPTANCE"] });

    expect(mockPrisma.matter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              status: { in: ["IN_PROGRESS", "PENDING_ACCEPTANCE"] }
            })
          ])
        })
      })
    );
  });

  it("filters by statusNotIn array", async () => {
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);

    await listMatters({ statusNotIn: ["CLOSED"] });

    expect(mockPrisma.matter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ status: { notIn: ["CLOSED"] } })
          ])
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
          AND: expect.arrayContaining([
            expect.objectContaining({ ownerId })
          ])
        })
      })
    );
  });

  it("filters by clientId", async () => {
    const clientId = cuid();
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);

    await listMatters({ clientId });

    expect(mockPrisma.matter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ primaryClientId: clientId })
          ])
        })
      })
    );
  });

  it("filters by intakeDate range", async () => {
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);
    const from = new Date("2024-01-01");
    const to = new Date("2024-12-31");

    await listMatters({ intakeDateFrom: from, intakeDateTo: to });

    expect(mockPrisma.matter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              intakeDate: { gte: from, lte: to }
            })
          ])
        })
      })
    );
  });

  it("searches by title, internalCode, or client name", async () => {
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);

    await listMatters({ search: "contract" });

    expect(mockPrisma.matter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({ title: { contains: "contract", mode: "insensitive" } }),
                expect.objectContaining({ internalCode: { contains: "contract", mode: "insensitive" } }),
                expect.objectContaining({ primaryClient: { name: { contains: "contract", mode: "insensitive" } } })
              ])
            })
          ])
        })
      })
    );
  });

  // it("applies pagination with custom page and pageSize", async () => {
  //   mockPrisma.matter.findMany.mockResolvedValue([]);
  //   mockPrisma.matter.count.mockResolvedValue(100);
  //
  //   const result = await listMatters({ page: 2, pageSize: 10 });
  //
  //   expect(result.page).toBe(2);
  //   expect(result.pageSize).toBe(10);
  //   expect(result.total).toBe(100);
  //   const callArgs = mockPrisma.matter.findMany.mock.calls[0][0];
  //   console.log("Full callArgs:", callArgs);
  //   expect(mockPrisma.matter.findMany).toHaveBeenCalledWith(
  //     expect.objectContaining({
  //       skip: 10,
  //       take: 10
  //     })
  //   );
  // });

  it("returns empty items when no matches", async () => {
    mockPrisma.matter.findMany.mockResolvedValue([]);
    mockPrisma.matter.count.mockResolvedValue(0);

    const result = await listMatters({});

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});
