// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import cuid from "cuid";
import {
  getMatterById,
  updateMatterBasicInfo,
  softDeleteMatter
} from "@/server/matters/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { withMetrics } from "@/lib/telemetry/server-metrics";
import * as permissions from "@/lib/permissions";
import * as archiveGuard from "@/lib/archive/guard";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    matter: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
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
  assertMatterWritable: vi.fn(),
  assertCanAccessMatter: vi.fn(),
  assertCanOwnMatter: vi.fn(),
  matterVisibilityFilter: vi.fn(() => ({}))
}));
vi.mock("@/lib/archive/guard", () => ({
  assertMatterWritable: vi.fn()
}));

const mockPrisma = vi.mocked(prisma, true);
const mockRequireSession = vi.mocked(requireSession);
const mockAudit = vi.mocked(audit);
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockWithMetrics = vi.mocked(withMetrics);
const mockAssertMatterWritable = vi.mocked(permissions.assertMatterWritable);
const mockAssertCanAccessMatter = vi.mocked(permissions.assertCanAccessMatter);
const mockAssertCanOwnMatter = vi.mocked(permissions.assertCanOwnMatter);
const mockArchiveAssertMatterWritable = vi.mocked(archiveGuard.assertMatterWritable);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN", name: "Admin" } });
  mockWithMetrics.mockImplementation((name, fn) => fn);
  mockAssertMatterWritable.mockImplementation(() => {});
  mockArchiveAssertMatterWritable.mockImplementation(() => {});
  mockAssertCanAccessMatter.mockImplementation(() => {});
  mockAssertCanOwnMatter.mockImplementation(() => {});
});

describe("matters actions", () => {
  describe("getMatterById", () => {
    it("should return matter if accessible", async () => {
      const mockMatter = { id: "m1", title: "Test Matter" } as any;
      mockPrisma.matter.findFirst.mockResolvedValue(mockMatter);

      const result = await getMatterById("m1");
      expect(result).toEqual(mockMatter);
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "MATTER_VIEW", targetId: "m1" })
      );
    });

    it("should return null if matter not found", async () => {
      mockPrisma.matter.findFirst.mockResolvedValue(null as any);
      const result = await getMatterById("m1");
      expect(result).toBeNull();
    });

    it("should throw if access denied", async () => {
      mockAssertCanAccessMatter.mockImplementation(() => {
        throw new Error("Access denied");
      });
      await expect(getMatterById("m1")).rejects.toThrow("Access denied");
    });
  });

  describe("updateMatterBasicInfo", () => {
    it("should update matter basic info", async () => {
      const id = cuid();
      const causeId = cuid();
      const input = {
        id,
        title: "UpdatedTitle",
        causeId,
        causeFreeText: "Cause details",
        claimAmount: 5000,
        ourStanding: "PLAINTIFF"
      };
      const existingMatter = { id, title: "Old Title", ownerId: "u1" } as any;
      mockPrisma.matter.findUnique.mockResolvedValue(existingMatter);
      mockPrisma.matter.update.mockResolvedValue({ id, ...input } as any);

      await updateMatterBasicInfo(input as any);

      expect(mockPrisma.matter.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id },
          data: expect.objectContaining({
            title: "UpdatedTitle",
            causeId,
            causeFreeText: "Cause details",
            claimAmount: expect.any(Object), // Prisma.Decimal
            ourStanding: "PLAINTIFF"
          })
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "MATTER_BASIC_UPDATE",
          targetId: id,
          detail: { titleBefore: "Old Title", titleAfter: "UpdatedTitle" }
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${id}`);
    });

    it("should throw if matter not found", async () => {
      const id = cuid();
      const input = {
        id,
        title: "New Title",
        causeId: cuid(),
        causeFreeText: "",
        claimAmount: null,
        ourStanding: null
      };
      mockPrisma.matter.findUnique.mockResolvedValue(null as any);
      await expect(updateMatterBasicInfo(input as any)).rejects.toThrow("Vụ án không tồn tại");
    });
  });

  describe("softDeleteMatter", () => {
    it("should soft delete matter", async () => {
      const id = cuid();
      const mockMatter = { id, ownerId: "u1", deletedAt: null } as any;
      mockPrisma.matter.findUnique.mockResolvedValue(mockMatter);
      mockPrisma.matter.update.mockResolvedValue({ id, deletedAt: expect.any(Date) } as any);

      const result = await softDeleteMatter(id);

      expect(mockPrisma.matter.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id },
          data: { deletedAt: expect.any(Date) }
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "MATTER_DELETE",
          targetId: id
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/matters");
      expect(result).toEqual({ ok: true });
    });

    it("should return ok:true even if matter not found (no existence check)", async () => {
      const id = cuid();
      mockPrisma.matter.findUnique.mockResolvedValue(null as any);
      mockPrisma.matter.update.mockResolvedValue({ id, deletedAt: expect.any(Date) } as any);

      const result = await softDeleteMatter(id);

      expect(mockPrisma.matter.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id },
          data: { deletedAt: expect.any(Date) }
        })
      );
      expect(result).toEqual({ ok: true });
    });
  });
});