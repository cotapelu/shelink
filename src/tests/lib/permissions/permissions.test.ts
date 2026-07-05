import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isManager,
  matterVisibilityFilter,
  matterAssociationFilter,
  assertCanLeadMatter,
  assertCanOwnMatter
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    matter: { findFirst: vi.fn() }
  }
}));

const mockFindFirst = vi.mocked(prisma.matter.findFirst, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("permissions", () => {
  describe("isManager", () => {
    it("returns true for ADMIN", () => {
      expect(isManager("ADMIN")).toBe(true);
    });
    it("returns true for PRINCIPAL_LAWYER", () => {
      expect(isManager("PRINCIPAL_LAWYER")).toBe(true);
    });
    it("returns false for other roles", () => {
      expect(isManager("LAWYER")).toBe(false);
      expect(isManager("ASSISTANT")).toBe(false);
      expect(isManager("FINANCE")).toBe(false);
    });
  });

  describe("matterVisibilityFilter", () => {
    it("returns empty object for manager or finance", () => {
      expect(matterVisibilityFilter("u1", "ADMIN")).toEqual({});
      expect(matterVisibilityFilter("u1", "FINANCE")).toEqual({});
    });
    it("returns OR filter for lawyer", () => {
      const filter = matterVisibilityFilter("u1", "LAWYER");
      expect(filter).toEqual({
        OR: [{ ownerId: "u1" }, { members: { some: { userId: "u1" } } }]
      });
    });
    it("returns members filter for assistant", () => {
      const filter = matterVisibilityFilter("u1", "ASSISTANT");
      expect(filter).toEqual({ members: { some: { userId: "u1" } } });
    });
  });

  describe("matterAssociationFilter", () => {
    it("returns OR filter for user", () => {
      const filter = matterAssociationFilter("u1");
      expect(filter).toEqual({
        OR: [{ ownerId: "u1" }, { members: { some: { userId: "u1" } } }]
      });
    });
  });

  describe("assertCanLeadMatter", () => {
    it("resolves if user is owner", async () => {
      mockFindFirst.mockResolvedValue({ id: "m1" } as any);
      await expect(assertCanLeadMatter("u1", "m1")).resolves.toBeUndefined();
      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "m1",
            OR: [
              { ownerId: "u1" },
              { members: { some: { userId: "u1", role: { in: ["LEAD", "CO_LEAD"] } } } }
            ]
          }),
          select: { id: true }
        })
      );
    });

    it("rejects if not lead", async () => {
      mockFindFirst.mockResolvedValue(null as any);
      await expect(assertCanLeadMatter("u1", "m1")).rejects.toThrow("Chỉ host/assistant của vụ án có thể thao tác");
    });
  });

  describe("assertCanOwnMatter", () => {
    it("resolves if user is owner", async () => {
      mockFindFirst.mockResolvedValue({ id: "m1" } as any);
      await expect(assertCanOwnMatter("u1", "m1")).resolves.toBeUndefined();
      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "m1",
            ownerId: "u1"
          }),
          select: { id: true }
        })
      );
    });

    it("rejects if not owner", async () => {
      mockFindFirst.mockResolvedValue(null as any);
      await expect(assertCanOwnMatter("u1", "m1")).rejects.toThrow("Chỉ host lawyer của vụ án có thể thao tác");
    });
  });
});
