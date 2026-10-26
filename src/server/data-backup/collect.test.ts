import { describe, it, expect, vi } from "vitest";
import { collectBackupData } from "./collect";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    // Chỉ khai báo delegate của genealogy để kiểm tra cả nhánh "thiếu delegate"
    person: { findMany: vi.fn().mockResolvedValue([{ id: "p1" }, { id: "p2" }]) },
    relationship: { findMany: vi.fn().mockResolvedValue([]) },
    event: { findMany: vi.fn().mockResolvedValue([{ id: "e1" }]) },
    lineage: { findMany: vi.fn().mockResolvedValue([]) }
  }
}));

const mockPrisma = vi.mocked(prisma, true);
const CAP = 20_000;

describe("collectBackupData", () => {
  it("reads genealogy models, returns sections + counts and applies the record cap", async () => {
    const { sections, counts } = await collectBackupData("genealogy");
    expect(Object.keys(counts).sort()).toEqual(["event", "lineage", "person", "relationship"]);
    expect(counts.person).toBe(2);
    expect(counts.event).toBe(1);
    expect(counts.relationship).toBe(0);
    expect(sections.person).toEqual([{ id: "p1" }, { id: "p2" }]);
    expect(mockPrisma.person.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: CAP }));
  });

  it("skips models whose delegate is missing instead of throwing", async () => {
    const { sections, counts } = await collectBackupData("erp"); // delegacy ERP chưa mock
    expect(counts).toEqual({});
    expect(sections).toEqual({});
  });
});
