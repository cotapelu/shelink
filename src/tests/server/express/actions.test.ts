import { describe, it, expect, vi, beforeEach } from "vitest";
import cuid from "cuid";
import { listExpress, createExpress, getExpress, deleteExpress } from "@/server/express/actions";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanAssociateMatter, matterAssociationFilter } from "@/lib/permissions";
import { trackExpress } from "@/lib/express/track";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    expressTracking: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    matter: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock("@/lib/archive/guard", () => ({
  assertMatterWritable: vi.fn(),
}));
vi.mock("@/lib/permissions", () => ({
  assertCanAssociateMatter: vi.fn(),
  matterAssociationFilter: vi.fn(),
}));
vi.mock("@/lib/express/track", () => ({
  trackExpress: vi.fn(),
  detectCompany: vi.fn(),
}));
vi.mock("@/server/audit", () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockPrisma = vi.mocked(prisma, true);
const mockAssertMatterWritable = vi.mocked(assertMatterWritable, true);
const mockAssertCanAssociateMatter = vi.mocked(assertCanAssociateMatter, true);
const mockTrackExpress = vi.mocked(trackExpress, true);
const mockMatterAssoc = vi.mocked(matterAssociationFilter, true);
const mockAudit = vi.mocked(audit, true);
const mockRevalidatePath = vi.mocked(revalidatePath, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "LAWYER" },
  } as any);
  mockMatterAssoc.mockReturnValue({ ownerId: "u1" });
  mockAssertMatterWritable.mockResolvedValue(undefined);
  mockAssertCanAssociateMatter.mockResolvedValue(undefined);
});

const CUID = (n: number) => `c${n.toString().padStart(24, "0")}`;

describe("express/actions", () => {
  describe("listExpress", () => {
    it("should require auth", async () => {
      mockRequireSession.mockRejectedValue(new Error("Unauthorized"));
      await expect(listExpress({})).rejects.toThrow("Unauthorized");
    });

    it("should list with default params", async () => {
      const mockRecords = [
        {
          id: CUID(1),
          trackingNo: "EX-001",
          matterId: CUID(10),
          purpose: "Purpose",
          direction: "OUTBOUND" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: "u1",
          matter: { id: CUID(10), internalCode: "IN-001", title: "Matter A" },
          createdBy: { id: CUID(20), name: "User" },
        },
      ];
      mockPrisma.expressTracking.findMany.mockResolvedValue(mockRecords as any);

      const result = await listExpress({});

      const callArg = mockPrisma.expressTracking.findMany.mock.calls[0][0]!;
      expect(callArg.orderBy).toEqual({ createdAt: "desc" });
      expect(callArg.include).toMatchObject({
        matter: { select: { id: true, internalCode: true, title: true } },
        createdBy: { select: { id: true, name: true } },
      });
      const accessWhere = (callArg.where as any).AND[0];
      expect(accessWhere).toHaveProperty("OR");
      const orConditions = accessWhere.OR;
      expect(orConditions).toHaveLength(2);
      expect(orConditions[0]).toMatchObject({
        matter: { deletedAt: null, ownerId: "u1" },
      });
      expect(orConditions[1]).toMatchObject({
        matterId: null,
        createdById: "u1",
      });
      expect(result).toEqual(mockRecords);
    });

    it("should apply scope='mine'", async () => {
      mockPrisma.expressTracking.findMany.mockResolvedValue([] as any);

      await listExpress({ scope: "mine" });

      const callArg = mockPrisma.expressTracking.findMany.mock.calls[0][0]!;
      const where = (callArg.where as any);
      expect(where).toHaveProperty("createdById");
      expect(where.createdById).toBe("u1");
    });

    it("should apply direction filter", async () => {
      mockPrisma.expressTracking.findMany.mockResolvedValue([] as any);

      await listExpress({ direction: "OUTBOUND" });

      const callArg = mockPrisma.expressTracking.findMany.mock.calls[0][0]!;
      const where = (callArg.where as any);
      expect(where.direction).toBe("OUTBOUND");
    });

    it("should apply search filter", async () => {
      mockPrisma.expressTracking.findMany.mockResolvedValue([] as any);

      await listExpress({ search: "test" });

      const callArg = mockPrisma.expressTracking.findMany.mock.calls[0][0]!;
      const where = (callArg.where as any);
      expect(Array.isArray(where.AND)).toBe(true);
      expect(where.AND).toHaveLength(2);
      expect(where.AND[1]).toHaveProperty("OR");
      const searchFields = where.AND[1].OR;
      expect(searchFields.some((cond: any) => cond.trackingNo?.contains)).toBe(true);
      expect(searchFields.some((cond: any) => cond.purpose?.contains)).toBe(true);
      expect(searchFields.some((cond: any) => cond.recipient?.contains)).toBe(true);
    });
  });

  describe("createExpress", () => {
    it("should create successfully", async () => {
      const matterId = CUID(10);
      mockPrisma.matter.findUnique.mockResolvedValue({
        id: matterId,
        deletedAt: null,
      } as any);
      mockTrackExpress.mockResolvedValue({ trackingNo: "EX-123", traces: {}, state: "DELIVERING" } as any);
      mockPrisma.expressTracking.create.mockResolvedValue({
        id: CUID(1),
        trackingNo: "EX-123",
        matterId,
        companyCode: "SF",
        direction: "OUTBOUND",
        purpose: "Test purpose",
        recipient: "Client",
        recipientPhone: null,
        lastState: "DELIVERING",
        tracesJson: {},
        lastUpdateAt: new Date(),
        createdById: "u1",
      } as any);

      const input = {
        trackingNo: "EX-123",
        direction: "OUTBOUND" as const,
        matterId,
        purpose: "Test purpose",
        recipient: "Client",
        companyCode: "SF",
      };

      const result = await createExpress(input);

      // Verify trackExpress called with correct args
      expect(mockTrackExpress).toHaveBeenCalledWith(
        { trackingNo: "EX-123", companyCode: "SF" }
      );
      expect(mockPrisma.expressTracking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            trackingNo: "EX-123",
            matterId,
            direction: "OUTBOUND",
            purpose: "Test purpose",
            recipient: "Client",
          }),
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "EXPRESS_CREATE",
          targetType: "ExpressTracking",
          targetId: expect.any(String),
          detail: expect.objectContaining({ trackingNo: "EX-123", direction: "OUTBOUND" }),
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/express");
      expect(result).toMatchObject({ ok: true, id: expect.any(String), firstState: "DELIVERING" });
    });

    it("should reject if matter not found", async () => {
      const matterId = CUID(10);
      mockPrisma.matter.findUnique.mockResolvedValue(null);

      const input = {
        trackingNo: "EX-123",
        direction: "OUTBOUND" as const,
        matterId,
        purpose: "Test",
        recipient: "Client",
        companyCode: "SF",
      };

      await expect(createExpress(input)).rejects.toThrow(
        "关联案件不存在"
      );
    });
  });

  describe("getExpress", () => {
    it("should fetch express by id", async () => {
      const id = CUID(1);
      const mockRecord = {
        id,
        trackingNo: "EX-001",
        matterId: CUID(10),
        purpose: "Purpose",
        direction: "OUTBOUND",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: "u1",
        matter: { id: CUID(10), internalCode: "IN-001", title: "Matter A" },
        createdBy: { id: CUID(20), name: "User" },
      };
      mockPrisma.expressTracking.findUnique.mockResolvedValue(mockRecord as any);

      const result = await getExpress(id);

      expect(result).toEqual(mockRecord);
    });

    it("should throw when not found", async () => {
      const id = CUID(1);
      mockPrisma.expressTracking.findUnique.mockResolvedValue(null as any);
      await expect(getExpress(id)).rejects.toThrow("快递记录不存在");
    });
  });

  describe("deleteExpress", () => {
    it("should delete successfully", async () => {
      const id = CUID(1);
      const input = { id };

      const mockRecord = { id, matterId: null as string | null, createdById: "u1" };
      mockPrisma.expressTracking.findUnique.mockResolvedValue(mockRecord as any);
      mockPrisma.expressTracking.delete.mockResolvedValue({ id } as any);

      await deleteExpress(input);

      expect(mockPrisma.expressTracking.delete).toHaveBeenCalledWith({ where: { id } });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/express");
    });

    it("should revalidate matter path if matterId exists", async () => {
      const id = CUID(1);
      const matterId = CUID(2);
      const input = { id };

      const mockRecord = { id, matterId, createdById: "u1" };
      mockPrisma.expressTracking.findUnique.mockResolvedValue(mockRecord as any);
      mockPrisma.expressTracking.delete.mockResolvedValue({ id } as any);

      await deleteExpress(input);

      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${matterId}`);
    });
  });
});
