import { vi, describe, it, expect, beforeEach } from "vitest";
import { searchMattersForInvoice } from "@/server/finance/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    matter: {
      findMany: vi.fn()
    }
  }
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("searchMattersForInvoice", () => {
  it("returns matching matters", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: "u1", role: "LAWYER", avatar: null }, expires: new Date().toISOString() });
    vi.mocked(prisma.matter.findMany).mockResolvedValue([
      { 
        id: "m1", 
        title: "Case A", 
        internalCode: "INT-001",
        category: "CIVIL_COMMERCIAL" as const,
        status: "IN_PROGRESS" as const,
        ownerId: "u1",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ] as any);

    const result = await searchMattersForInvoice("Case");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m1");
  });

  it("returns empty array when no matches", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: "u1", role: "LAWYER", avatar: null }, expires: new Date().toISOString() });
    vi.mocked(prisma.matter.findMany).mockResolvedValue([] as any);

    const result = await searchMattersForInvoice("Nonexistent");

    expect(result).toEqual([]);
  });
});
