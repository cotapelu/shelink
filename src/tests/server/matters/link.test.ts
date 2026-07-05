// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import cuid from "cuid";
import {
  searchMattersForLink,
  addMatterLink,
  removeMatterLink
} from "@/server/matters/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { withMetrics } from "@/lib/telemetry/server-metrics";
import * as permissions from "@/lib/permissions";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    matter: {
      findMany: vi.fn()
    },
    matterLink: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/server/audit");
vi.mock("next/cache");
vi.mock("@/lib/telemetry/server-metrics", () => ({
  withMetrics: vi.fn((name, fn) => fn)
}));
vi.mock("@/lib/permissions", () => ({
  assertCanAssociateMatter: vi.fn(),
  matterAssociationFilter: vi.fn(() => ({}))
}));

const mockPrisma = vi.mocked(prisma, true);
const mockRequireSession = vi.mocked(requireSession);
const mockAudit = vi.mocked(audit);
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockWithMetrics = vi.mocked(withMetrics);
const mockAssertCanAssociateMatter = vi.mocked(permissions.assertCanAssociateMatter);
const mockMatterAssociationFilter = vi.mocked(permissions.matterAssociationFilter);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN", name: "Admin" } });
  mockWithMetrics.mockImplementation((name, fn) => fn);
  mockAssertCanAssociateMatter.mockImplementation(() => {});
  mockMatterAssociationFilter.mockReturnValue({});
});

describe("Matter linking actions", () => {
  describe("searchMattersForLink", () => {
    it("should return matters excluding already linked ones", async () => {
      const matterId = cuid();
      const query = "test";
      const mockLinks: any[] = [];
      const mockMatters = [
        { id: "m2", internalCode: "IC2", title: "Matter2" },
        { id: "m3", internalCode: "IC3", title: "Matter3" }
      ] as any;
      mockPrisma.matterLink.findMany.mockResolvedValue(mockLinks);
      mockPrisma.matter.findMany.mockResolvedValue(mockMatters);

      const result = await searchMattersForLink(matterId, query);

      expect(result).toEqual(mockMatters);
      expect(mockPrisma.matterLink.findMany).toHaveBeenCalledWith({
        where: { OR: [{ matterId }, { relatedMatterId: matterId }] },
        select: { matterId: true, relatedMatterId: true }
      });
      expect(mockPrisma.matter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            id: { notIn: expect.arrayContaining([matterId]) }
          }),
          select: { id: true, internalCode: true, title: true },
          orderBy: { createdAt: "desc" },
          take: 8
        })
      );
    });

    it("should handle empty query and not include OR clause", async () => {
      const matterId = cuid();
      mockPrisma.matterLink.findMany.mockResolvedValue([]);
      const mockMatters = [{ id: "m2", internalCode: "IC2", title: "Matter2" }] as any;
      mockPrisma.matter.findMany.mockResolvedValue(mockMatters);

      await searchMattersForLink(matterId, "");

      expect(mockPrisma.matter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            id: { notIn: expect.arrayContaining([matterId]) }
            // no OR when query empty
          })
        })
      );
    });
  });

  describe("addMatterLink", () => {
    it("should throw if linking to the same matter", async () => {
      const matterId = cuid();
      await expect(addMatterLink(matterId, matterId)).rejects.toThrow("Không thể liên kết đến chính vụ án này");
    });

    it("should create link successfully", async () => {
      const matterId = cuid();
      const relatedMatterId = cuid();
      mockPrisma.matterLink.upsert.mockResolvedValue({} as any);

      await addMatterLink(matterId, relatedMatterId);

      expect(mockPrisma.matterLink.upsert).toHaveBeenCalledWith({
        where: { matterId_relatedMatterId: { matterId, relatedMatterId } },
        create: { matterId, relatedMatterId },
        update: {}
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "MATTER_LINK_ADD",
          targetType: "Matter",
          targetId: matterId,
          detail: { relatedMatterId }
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${matterId}`);
    });
  });

  describe("removeMatterLink", () => {
    it("should delete link in both directions", async () => {
      const matterId = cuid();
      const relatedMatterId = cuid();
      mockPrisma.matterLink.deleteMany.mockResolvedValue({} as any);

      await removeMatterLink(matterId, relatedMatterId);

      expect(mockPrisma.matterLink.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { matterId, relatedMatterId },
            { matterId: relatedMatterId, relatedMatterId: matterId }
          ]
        }
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "MATTER_LINK_REMOVE",
          targetType: "Matter",
          targetId: matterId,
          detail: { relatedMatterId }
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${matterId}`);
    });
  });
});