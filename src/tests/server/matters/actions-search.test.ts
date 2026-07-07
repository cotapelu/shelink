// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchMattersForLink
} from "@/server/matters/actions";
import { requireSession } from "@/lib/auth/session";
import { assertCanAssociateMatter } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    matterLink: {
      findMany: vi.fn()
    },
    matter: {
      findMany: vi.fn()
    }
  }
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/permissions", () => ({
  assertCanAssociateMatter: vi.fn(),
  matterAssociationFilter: vi.fn(() => ({}))
}));

const mockRequireSession = vi.mocked(requireSession);
const mockAssertCanAssociateMatter = vi.mocked(assertCanAssociateMatter);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
  mockAssertCanAssociateMatter.mockResolvedValue(undefined);
});

describe("searchMattersForLink", () => {
  it("should return matters excluding linked ones", async () => {
    const mockLinks = [
      { matterId: "m1", relatedMatterId: "m2" },
      { matterId: "m3", relatedMatterId: "m1" }
    ];
    vi.mocked(prisma.matterLink.findMany).mockResolvedValue(mockLinks as any);
    vi.mocked(prisma.matter.findMany).mockResolvedValue([
      { id: "m4", internalCode: "INT-004", title: "Matter 4" }
    ] as any);

    const result = await searchMattersForLink("m1", "test");

    expect(mockAssertCanAssociateMatter).toHaveBeenCalledWith("u1", "m1");
    expect(prisma.matterLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ matterId: "m1" }, { relatedMatterId: "m1" }] }
      })
    );
    expect(prisma.matter.findMany).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m4");
  });

  it("returns empty when no matches", async () => {
    vi.mocked(prisma.matterLink.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.matter.findMany).mockResolvedValue([] as any);

    const result = await searchMattersForLink("m1", "xyz");
    expect(result).toEqual([]);
  });
});
