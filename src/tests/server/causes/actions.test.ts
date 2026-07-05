// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchCauses,
  getCauseById,
  listCauseL2,
  type CauseSearchResult
} from "@/server/causes/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    causeOfAction: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    }
  }
}));

vi.mock("@/lib/auth/session", () => ({
  requireSession: vi.fn()
}));

const mockPrismaCause = vi.mocked(prisma.causeOfAction, true);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireSession).mockResolvedValue(undefined);
});

function createMockCause(overlay: Partial<any> = {}): any {
  return {
    id: "1",
    code: "CC-7",
    name: "Labor Dispute",
    shortName: "Labor",
    level: 2,
    parentId: "10",
    parent: {
      id: "10",
      name: "Civil",
      level: 1,
      parent: null
    },
    ...overlay
  };
}

function flattenMock(c: any): CauseSearchResult {
  const chain: { name: string; level: number }[] = [{ name: c.name, level: c.level }];
  if (c.parent) chain.push({ name: c.parent.name, level: c.parent.level });
  if (c.parent?.parent) chain.push({ name: c.parent.parent.name, level: c.parent.parent.level });
  const l1 = chain.find((x) => x.level === 1)?.name ?? null;
  const l2 = chain.find((x) => x.level === 2)?.name ?? null;
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    shortName: c.shortName,
    level: c.level,
    parentId: c.parentId,
    l1Name: l1,
    l2Name: l2
  };
}

describe("causes/actions - server actions", () => {
  describe("searchCauses", () => {
    const mockCause = createMockCause();
    const mockFlattened = flattenMock(mockCause);

    it("should call requireSession", async () => {
      mockPrismaCause.findMany.mockResolvedValue([mockCause]);
      await searchCauses({ category: "CIVIL_COMMERCIAL" });
      expect(requireSession).toHaveBeenCalledTimes(1);
    });

    it("should return flattened results when empty query", async () => {
      mockPrismaCause.findMany.mockResolvedValue([mockCause]);
      const result = await searchCauses({ category: "CIVIL_COMMERCIAL" });
      expect(result).toEqual([mockFlattened]);
    });

    it("should respect limit (max 2000)", async () => {
      mockPrismaCause.findMany.mockResolvedValue([mockCause]);
      await searchCauses({ category: "CIVIL_COMMERCIAL", limit: 5000 });
      expect(mockPrismaCause.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 2000 // capped
        })
      );
    });

    it("should apply codePrefixes for COMMERCIAL_ARBITRATION inside AND", async () => {
      mockPrismaCause.findMany.mockResolvedValue([mockCause]);
      await searchCauses({
        category: "COMMERCIAL_ARBITRATION",
        query: "labor"
      });
      const callArg = mockPrismaCause.findMany.mock.calls[0][0];
      // Verify AND array exists with codeFilter OR as first element
      const andArray = callArg.where.AND;
      expect(andArray).toBeDefined();
      const codeFilterOr = (andArray[0] as any)?.OR;
      expect(codeFilterOr).toBeDefined();
      expect(codeFilterOr).toContainEqual({ code: "CC-3" });
      expect(codeFilterOr).toContainEqual({ code: { startsWith: "CC-3-" } });
      expect(codeFilterOr).toContainEqual({ code: "CC-4" });
      expect(codeFilterOr).toContainEqual({ code: { startsWith: "CC-4-" } });
      expect(codeFilterOr).toContainEqual({ code: "CC-5" });
      expect(codeFilterOr).toContainEqual({ code: { startsWith: "CC-5-" } });
      expect(codeFilterOr).toContainEqual({ code: "CC-6" });
      expect(codeFilterOr).toContainEqual({ code: { startsWith: "CC-6-" } });
      expect(codeFilterOr).toContainEqual({ code: "CC-8" });
      expect(codeFilterOr).toContainEqual({ code: { startsWith: "CC-8-" } });
      expect(codeFilterOr).toContainEqual({ code: "CC-9" });
      expect(codeFilterOr).toContainEqual({ code: { startsWith: "CC-9-" } });
    });

    it("should search by name/shortName/keywords/pinyin when query provided", async () => {
      mockPrismaCause.findMany.mockResolvedValue([mockCause]);
      await searchCauses({
        category: "CIVIL_COMMERCIAL",
        query: "labor"
      });
      const callArg = mockPrismaCause.findMany.mock.calls[0][0];
      const andArray = callArg.where.AND;
      // When no codePrefixes, query OR is the first (and only) AND element
      const queryOr = (andArray[0] as any)?.OR;
      expect(queryOr).toBeDefined();
      expect(queryOr).toContainEqual({
        name: { contains: "labor", mode: "insensitive" }
      });
      expect(queryOr).toContainEqual({
        shortName: { contains: "labor", mode: "insensitive" }
      });
      expect(queryOr).toContainEqual({ keywords: { has: "labor" } });
      expect(queryOr).toContainEqual({
        pinyin: { contains: "labor", mode: "insensitive" }
      });
    });
  });

  describe("getCauseById", () => {
    it("should return null when cause not found", async () => {
      mockPrismaCause.findUnique.mockResolvedValue(null);
      const result = await getCauseById("nonexistent");
      expect(result).toBeNull();
    });

    it("should return flattened cause with category when found", async () => {
      const mockCause = createMockCause({ category: "CIVIL_COMMERCIAL" });
      mockPrismaCause.findUnique.mockResolvedValue(mockCause);
      const result = await getCauseById("1");
      expect(result).toEqual({
        ...flattenMock(mockCause),
        category: "CIVIL_COMMERCIAL"
      });
    });
  });

  describe("listCauseL2", () => {
    it("should list level 2 causes for category", async () => {
      const mockList = [
        { id: "20", code: "CC-7-1", name: "Sub A", parentId: "19" },
        { id: "21", code: "CC-7-2", name: "Sub B", parentId: "19" }
      ] as any;
      mockPrismaCause.findMany.mockResolvedValue(mockList);
      const result = await listCauseL2("CIVIL_COMMERCIAL");
      expect(result).toEqual(mockList);
      expect(mockPrismaCause.findMany).toHaveBeenCalledWith({
        where: { category: "CIVIL_COMMERCIAL", active: true, level: 2 },
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true, parentId: true }
      });
    });
  });
});
