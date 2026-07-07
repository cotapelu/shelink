// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createExpressTracking,
  listExpressTrackings,
  updateExpressStatus,
} from "@/server/shared/express.actions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    expressTracking: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("next/cache");

const mockPrisma = vi.mocked(prisma, true);
const mockGetServerSession = getServerSession as any;
const mockRevalidatePath = vi.mocked(revalidatePath);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN", name: "Admin" } });
});

describe("express actions", () => {
  describe("createExpressTracking", () => {
    it("should create tracking with required fields", async () => {
      const mockTracking = { id: "et1", trackingNo: "TRK123", companyCode: null, matterId: null, direction: "OUTBOUND", purpose: "GENERAL", lastState: "CREATED", createdById: "u1" };
      mockPrisma.expressTracking.create.mockResolvedValue(mockTracking);

      const result = await createExpressTracking({ trackingNumber: "TRK123" });
      expect(result).toEqual(mockTracking);
      expect(mockPrisma.expressTracking.create).toHaveBeenCalledWith({
        data: {
          trackingNo: "TRK123",
          companyCode: null,
          matterId: null,
          direction: "OUTBOUND",
          purpose: "GENERAL",
          lastState: "CREATED",
          createdById: "u1",
        } as any,
      });
    });

    it("should create tracking with all optional fields", async () => {
      const mockTracking = { id: "et2", trackingNo: "TRK456", companyCode: "UPS", matterId: "m1", direction: "OUTBOUND", purpose: "DELIVERY", lastState: "CREATED", createdById: "u1" };
      mockPrisma.expressTracking.create.mockResolvedValue(mockTracking);

      const result = await createExpressTracking({
        trackingNumber: "TRK456",
        carrier: "UPS",
        matterId: "m1",
        purpose: "DELIVERY",
      });
      expect(result).toEqual(mockTracking);
      expect(mockPrisma.expressTracking.create).toHaveBeenCalledWith({
        data: {
          trackingNo: "TRK456",
          companyCode: "UPS",
          matterId: "m1",
          direction: "OUTBOUND",
          purpose: "DELIVERY",
          lastState: "CREATED",
          createdById: "u1",
        } as any,
      });
    });

    it("should throw when unauthorized", async () => {
      mockGetServerSession.mockResolvedValue(null);
      await expect(createExpressTracking({ trackingNumber: "TRK" })).rejects.toThrow("Unauthorized");
    });
  });

  describe("listExpressTrackings", () => {
    it("should list all trackings with default ordering", async () => {
      const mockList = [{ id: "et1" }, { id: "et2" }];
      mockPrisma.expressTracking.findMany.mockResolvedValue(mockList);

      const result = await listExpressTrackings();
      expect(result).toEqual(mockList);
      expect(mockPrisma.expressTracking.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: "desc" },
        include: {
          matter: { select: { id: true, title: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
    });

    it("should filter by status", async () => {
      mockPrisma.expressTracking.findMany.mockResolvedValue([]);
      await listExpressTrackings("IN_TRANSIT");
      expect(mockPrisma.expressTracking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { lastState: "IN_TRANSIT" },
        })
      );
    });

    it("should throw when unauthorized", async () => {
      mockGetServerSession.mockResolvedValue(null);
      await expect(listExpressTrackings()).rejects.toThrow("Unauthorized");
    });
  });

  describe("updateExpressStatus", () => {
    it("should update status and return updated tracking", async () => {
      const mockUpdated = { id: "et1", lastState: "DELIVERED", lastUpdateAt: new Date() };
      mockPrisma.expressTracking.update.mockResolvedValue(mockUpdated);

      const result = await updateExpressStatus("et1", "DELIVERED");
      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.expressTracking.update).toHaveBeenCalledWith({
        where: { id: "et1" },
        data: {
          lastState: "DELIVERED",
          lastUpdateAt: expect.any(Date),
          tracesJson: undefined,
        } as any,
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/express");
    });

    it("should include location in tracesJson when provided", async () => {
      const mockUpdated = { id: "et1", lastState: "IN_TRANSIT", tracesJson: { lastLocation: "HCM", updatedAt: new Date() } };
      mockPrisma.expressTracking.update.mockResolvedValue(mockUpdated);

      const result = await updateExpressStatus("et1", "IN_TRANSIT", "HCM");
      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.expressTracking.update).toHaveBeenCalledWith({
        where: { id: "et1" },
        data: {
          lastState: "IN_TRANSIT",
          lastUpdateAt: expect.any(Date),
          tracesJson: { lastLocation: "HCM", updatedAt: expect.any(Date) },
        } as any,
      });
    });

    it("should throw when unauthorized", async () => {
      mockGetServerSession.mockResolvedValue(null);
      await expect(updateExpressStatus("et1", "DELIVERED")).rejects.toThrow("Unauthorized");
    });
  });
});
