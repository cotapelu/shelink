// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listIntakes,
  getIntake,
  createIntake,
  updateIntake,
  assignIntake,
  convertIntakeToMatter,
  deleteIntake,
} from "@/server/intake/actions";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    intake: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    matter: {
      create: vi.fn(),
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
  mockGetServerSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER", name: "Test" } });
});

describe("intake actions", () => {
  describe("listIntakes", () => {
    it("should list all intakes with include", async () => {
      const mockIntakes = [{ id: "i1" }, { id: "i2" }];
      mockPrisma.intake.findMany.mockResolvedValue(mockIntakes);

      const result = await listIntakes();
      expect(result).toEqual(mockIntakes);
      expect(mockPrisma.intake.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          ownerUser: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it("should filter by status", async () => {
      mockPrisma.intake.findMany.mockResolvedValue([]);
      await listIntakes({ status: "PENDING" });
      expect(mockPrisma.intake.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "PENDING" },
        })
      );
    });

    it("should filter by ownerId", async () => {
      mockPrisma.intake.findMany.mockResolvedValue([]);
      await listIntakes({ ownerId: "u2" });
      expect(mockPrisma.intake.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerUserId: "u2" },
        })
      );
    });

    it("should throw when unauthorized", async () => {
      mockGetServerSession.mockResolvedValue(null);
      await expect(listIntakes()).rejects.toThrow("Unauthorized");
    });
  });

  describe("getIntake", () => {
    it("should get intake by id", async () => {
      const mockIntake = { id: "i1", title: "Test" };
      mockPrisma.intake.findUnique.mockResolvedValue(mockIntake);
      const result = await getIntake("i1");
      expect(result).toEqual(mockIntake);
      expect(mockPrisma.intake.findUnique).toHaveBeenCalledWith({
        where: { id: "i1" },
        include: {
          ownerUser: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
          parties: true,
          documents: true,
        },
      });
    });

    it("should throw if not found", async () => {
      mockPrisma.intake.findUnique.mockResolvedValue(null);
      await expect(getIntake("nonexistent")).rejects.toThrow("Intake not found");
    });

    it("should throw when unauthorized", async () => {
      mockGetServerSession.mockResolvedValue(null);
      await expect(getIntake("i1")).rejects.toThrow("Unauthorized");
    });
  });

  describe("createIntake", () => {
    it("should create intake with required fields", async () => {
      const mockIntake = { id: "i1", title: "New", description: null, category: "CIVIL_COMMERCIAL" };
      mockPrisma.intake.create.mockResolvedValue(mockIntake);

      const result = await createIntake({ title: "New", category: "CIVIL_COMMERCIAL" });
      expect(result).toEqual(mockIntake);
      expect(mockPrisma.intake.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "New",
          category: "CIVIL_COMMERCIAL",
          ownerUserId: "u1",
        }),
      });
    });

    it("should include optional fields", async () => {
      mockPrisma.intake.create.mockResolvedValue({ id: "i2" });
      await createIntake({ title: "Full", description: "Desc", category: "CRIMINAL" });
      expect(mockPrisma.intake.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "Full",
          description: "Desc",
          category: "CRIMINAL",
        }),
      });
    });

    it("should throw when unauthorized", async () => {
      mockGetServerSession.mockResolvedValue(null);
      await expect(createIntake({ title: "Test" })).rejects.toThrow("Unauthorized");
    });
  });

  describe("updateIntake", () => {
    it("should update intake", async () => {
      const mockUpdated = { id: "i1", title: "Updated" };
      mockPrisma.intake.update.mockResolvedValue(mockUpdated);

      const result = await updateIntake("i1", { title: "Updated" });
      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.intake.update).toHaveBeenCalledWith({
        where: { id: "i1" },
        data: { title: "Updated" },
      });
    });

    // Note: Prisma throws on not found; we test success path only

    it("should throw when unauthorized", async () => {
      mockGetServerSession.mockResolvedValue(null);
      await expect(updateIntake("i1", {})).rejects.toThrow("Unauthorized");
    });
  });

  describe("assignIntake", () => {
    it("should assign intake to new owner and set status", async () => {
      const mockIntake = { id: "i1", ownerUserId: "u2", status: "PENDING_CONFIRMATION" };
      mockPrisma.intake.update.mockResolvedValue(mockIntake);

      const result = await assignIntake("i1", "u2");
      expect(result).toEqual(mockIntake);
      expect(mockPrisma.intake.update).toHaveBeenCalledWith({
        where: { id: "i1" },
        data: {
          ownerUserId: "u2",
          status: "PENDING_CONFIRMATION",
        } as any,
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/intakes");
    });

    it("should throw when unauthorized", async () => {
      mockGetServerSession.mockResolvedValue(null);
      await expect(assignIntake("i1", "u2")).rejects.toThrow("Unauthorized");
    });
  });

  describe("convertIntakeToMatter", () => {
    it("should convert intake to matter", async () => {
      const mockIntake = { id: "i1", title: "Convert", description: "Desc", category: "CIVIL_COMMERCIAL" };
      const mockMatter = { id: "m1", title: "Convert" };
      mockPrisma.intake.findUnique.mockResolvedValue(mockIntake);
      mockPrisma.matter.create.mockResolvedValue(mockMatter);
      mockPrisma.intake.update.mockResolvedValue({});

      const result = await convertIntakeToMatter("i1");
      expect(result).toEqual(mockMatter);
      expect(mockPrisma.matter.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "Convert",
          description: "Desc",
          category: "CIVIL_COMMERCIAL",
          status: "PENDING_ACCEPTANCE",
          intakeDate: expect.any(Date),
          intake: { connect: { id: "i1" } },
        }),
      });
      expect(mockPrisma.intake.update).toHaveBeenCalledWith({
        where: { id: "i1" },
        data: {
          status: "CONVERTED",
          matter: { connect: { id: "m1" } },
        } as any,
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    it("should throw if intake not found", async () => {
      mockPrisma.intake.findUnique.mockResolvedValue(null);
      await expect(convertIntakeToMatter("nonexistent")).rejects.toThrow("Intake not found");
    });

    it("should throw when unauthorized", async () => {
      mockGetServerSession.mockResolvedValue(null);
      await expect(convertIntakeToMatter("i1")).rejects.toThrow("Unauthorized");
    });
  });

  describe("deleteIntake", () => {
    it("should delete intake", async () => {
      mockPrisma.intake.delete.mockResolvedValue({});

      const result = await deleteIntake("i1");
      expect(result).toEqual({ ok: true });
      expect(mockPrisma.intake.delete).toHaveBeenCalledWith({
        where: { id: "i1" },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/intakes");
    });

    it("should throw when unauthorized", async () => {
      mockGetServerSession.mockResolvedValue(null);
      await expect(deleteIntake("i1")).rejects.toThrow("Unauthorized");
    });
  });
});
