// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addMatterLink,
  removeMatterLink
} from "@/server/matters/actions";
import { requireSession } from "@/lib/auth/session";
import { assertCanAssociateMatter } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    matterLink: {
      upsert: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/server/audit");
vi.mock("next/cache");
vi.mock("@/lib/permissions", () => ({
  assertCanAssociateMatter: vi.fn()
}));

const mockRequireSession = vi.mocked(requireSession);
const mockAssertCanAssociateMatter = vi.mocked(assertCanAssociateMatter);
const mockAudit = vi.mocked(audit);
const mockRevalidatePath = vi.mocked(revalidatePath);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
  mockAssertCanAssociateMatter.mockImplementation(() => {});
});

describe("matter linking", () => {
  describe("addMatterLink", () => {
    it("should create a link between two matters", async () => {
      prisma.matterLink.upsert.mockResolvedValue({} as any);

      await addMatterLink("m1", "m2");

      expect(mockAssertCanAssociateMatter).toHaveBeenCalledTimes(2);
      expect(mockAssertCanAssociateMatter).toHaveBeenNthCalledWith(1, "u1", "m1");
      expect(mockAssertCanAssociateMatter).toHaveBeenNthCalledWith(2, "u1", "m2");
      expect(prisma.matterLink.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { matterId_relatedMatterId: { matterId: "m1", relatedMatterId: "m2" } }
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "MATTER_LINK_ADD",
          targetId: "m1",
          detail: { relatedMatterId: "m2" }
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/matters/m1");
    });

    it("should throw if linking matter to itself", async () => {
      await expect(addMatterLink("m1", "m1")).rejects.toThrow(
        "Không thể liên kết đến chính vụ án này"
      );
    });
  });

  describe("removeMatterLink", () => {
    it("should remove bidirectional link", async () => {
      prisma.matterLink.deleteMany.mockResolvedValue({ count: 1 } as any);

      await removeMatterLink("m1", "m2");

      expect(mockAssertCanAssociateMatter).toHaveBeenCalledTimes(2);
      expect(prisma.matterLink.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { matterId: "m1", relatedMatterId: "m2" },
              { matterId: "m2", relatedMatterId: "m1" }
            ]
          }
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "MATTER_LINK_REMOVE",
          targetId: "m1",
          detail: { relatedMatterId: "m2" }
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/matters/m1");
    });
  });
});
