// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listExternalContacts,
  createExternalContact,
  updateExternalContact,
  approveExternalContact,
  rejectExternalContact,
  archiveExternalContact,
} from "@/server/external-contacts/actions";
import { requireSession } from "@/lib/auth/session";
import { isManager } from "@/lib/permissions";
import { audit } from "@/server/audit";
import { createNotification } from "@/server/notifications/create";
import { notifyRoleApprovers } from "@/server/notifications/approval";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/permissions");
vi.mock("@/server/audit");
vi.mock("@/server/notifications/create");
vi.mock("@/server/notifications/approval");
vi.mock("next/cache");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    externalContact: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockIsManager = vi.mocked(isManager, true);
const mockAudit = vi.mocked(audit, true);
const mockCreateNotification = vi.mocked(createNotification, true);
const mockNotifyRoleApprovers = vi.mocked(notifyRoleApprovers, true);
const mockRevalidatePath = vi.mocked(revalidatePath, true);
const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "LAWYER", name: "User 1" },
  } as any);
  mockIsManager.mockReturnValue(false);
});

const CUID = (n: number) => `c${n.toString().padStart(24, "0")}`; // 25 chars

describe("external-contacts/actions", () => {
  describe("listExternalContacts", () => {
    it("should list contacts with no filter", async () => {
      mockPrisma.externalContact.findMany.mockResolvedValue([]);
      await listExternalContacts();
      expect(mockPrisma.externalContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { archivedAt: null, status: "APPROVED" },
        })
      );
    });

    it("should include PENDING_REVIEW for manager", async () => {
      mockIsManager.mockReturnValue(true);
      mockPrisma.externalContact.findMany.mockResolvedValue([]);
      await listExternalContacts();
      const where = mockPrisma.externalContact.findMany.mock.calls[0][0].where as any;
      expect(where.status).toEqual({ in: ["APPROVED", "PENDING_REVIEW"] });
    });

    it("should filter by category", async () => {
      mockPrisma.externalContact.findMany.mockResolvedValue([]);
      await listExternalContacts({ category: "COURT" });
      const where = mockPrisma.externalContact.findMany.mock.calls[0][0].where as any;
      expect(where.category).toBe("COURT");
    });

    it("should filter by search", async () => {
      mockPrisma.externalContact.findMany.mockResolvedValue([]);
      await listExternalContacts({ search: "test" });
      const where = mockPrisma.externalContact.findMany.mock.calls[0][0].where as any;
      expect(where.OR).toEqual([
        { name: { contains: "test", mode: "insensitive" } },
        { organization: { contains: "test", mode: "insensitive" } },
        { phone: { contains: "test" } },
      ]);
    });
  });

  describe("createExternalContact", () => {
    it("should create with APPROVED status for manager", async () => {
      mockIsManager.mockReturnValue(true);
      mockPrisma.externalContact.create.mockResolvedValue({
        id: CUID(1),
        name: "Contact A",
        category: "COURT",
        status: "APPROVED",
        createdById: "u1",
      });

      const result = await createExternalContact({
        name: "Contact A",
        category: "COURT",
      });

      expect(result.status).toBe("APPROVED");
      expect(mockNotifyRoleApprovers).not.toHaveBeenCalled();
    });

    it("should create with PENDING_REVIEW for non-manager", async () => {
      mockIsManager.mockReturnValue(false);
      mockPrisma.externalContact.create.mockResolvedValue({
        id: CUID(1),
        name: "Pending",
        category: "POLICE",
        status: "PENDING_REVIEW",
        createdById: "u1",
      });

      await createExternalContact({
        name: "Pending",
        category: "POLICE",
      });

      expect(mockNotifyRoleApprovers).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: ["ADMIN", "PRINCIPAL_LAWYER"],
          title: "新的通讯录联系人待审核",
          content: expect.stringContaining("新增了外部联系人"),
        })
      );
    });

    it("should trim name and empty optional fields", async () => {
      mockIsManager.mockReturnValue(true);
      mockPrisma.externalContact.create.mockResolvedValue({
        id: CUID(1),
        name: "Trimmed",
        category: "EXPERT",
        status: "APPROVED",
        createdById: "u1",
      });

      await createExternalContact({
        name: "  Trimmed  ",
        category: "EXPERT",
        organization: "",
        phone: "  ",
        wechat: "",
        notes: "   note   ",
      });

      const data = mockPrisma.externalContact.create.mock.calls[0][0].data as any;
      expect(data.name).toBe("Trimmed"); // trimmed
      expect(data.organization).toBeNull();
      expect(data.phone).toBeNull();
      expect(data.wechat).toBeNull();
      expect(data.notes).toBe("note"); // trimmed
    });

    it("should call audit with correct details", async () => {
      mockIsManager.mockReturnValue(true);
      mockPrisma.externalContact.create.mockResolvedValue({
        id: CUID(1),
        name: "Test",
        category: "OTHER",
        status: "APPROVED",
      });

      await createExternalContact({ name: "Test", category: "OTHER" });

      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "EXTERNAL_CONTACT_CREATE",
          targetType: "ExternalContact",
          detail: expect.objectContaining({ name: "Test", status: "APPROVED" }),
        })
      );
    });
  });

  describe("updateExternalContact", () => {
    it("should allow admin/principal or creator to update", async () => {
      mockPrisma.externalContact.findUnique.mockResolvedValue({
        id: CUID(1),
        createdById: "u1",
      });
      mockPrisma.externalContact.update.mockResolvedValue({ id: CUID(1) });

      await updateExternalContact({
        id: CUID(1),
        name: "Updated",
        category: "COURT",
      });

      expect(mockPrisma.externalContact.update).toHaveBeenCalled();
    });

    it("should reject if not creator and not manager", async () => {
      mockPrisma.externalContact.findUnique.mockResolvedValue({
        id: CUID(1),
        createdById: "u2",
      });
      await expect(
        updateExternalContact({ id: CUID(1), name: "X", category: "COURT" })
      ).rejects.toThrow("无权修改此联系人");
    });

    it("should allow manager to update any", async () => {
      // Manager must be ADMIN/PRINCIPAL_LWY; override session role
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "ADMIN" },
      } as any);
      mockIsManager.mockReturnValue(true);
      mockPrisma.externalContact.findUnique.mockResolvedValue({
        id: CUID(1),
        createdById: "u2",
      });
      mockPrisma.externalContact.update.mockResolvedValue({ id: CUID(1) });
      await updateExternalContact({ id: CUID(1), name: "X", category: "COURT" });
      expect(mockPrisma.externalContact.update).toHaveBeenCalled();
    });
  });

  describe("approveExternalContact", () => {
    it("should approve pending contact", async () => {
      mockIsManager.mockReturnValue(true);
      mockPrisma.externalContact.findUnique.mockResolvedValue({
        id: CUID(1),
        name: "Pending",
        status: "PENDING_REVIEW",
        createdById: "u2",
      });
      mockPrisma.externalContact.update.mockResolvedValue({
        id: CUID(1),
        status: "APPROVED",
      });

      await approveExternalContact({ id: CUID(1), note: "OK" });

      expect(mockPrisma.externalContact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "APPROVED",
            reviewedById: "u1",
            reviewNote: "OK",
          }),
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "EXTERNAL_CONTACT_APPROVE",
          detail: { note: "OK" },
        })
      );
    });

    it("should reject if not manager", async () => {
      mockIsManager.mockReturnValue(false);
      await expect(
        approveExternalContact({ id: CUID(1) })
      ).rejects.toThrow("仅管理员可审核联系人");
    });

    it("should reject if not pending", async () => {
      mockIsManager.mockReturnValue(true);
      mockPrisma.externalContact.findUnique.mockResolvedValue({
        id: CUID(1),
        status: "APPROVED",
      });
      await expect(approveExternalContact({ id: CUID(1) })).rejects.toThrow(
        "该联系人当前不在待审核状态"
      );
    });

    it("should notify creator if not self", async () => {
      mockIsManager.mockReturnValue(true);
      mockPrisma.externalContact.findUnique.mockResolvedValue({
        id: CUID(1),
        name: "Pending",
        status: "PENDING_REVIEW",
        createdById: "u2",
      });
      mockPrisma.externalContact.update.mockResolvedValue({
        id: CUID(1),
        status: "APPROVED",
      });

      await approveExternalContact({ id: CUID(1), note: "" });

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u2",
          type: "SYSTEM",
          title: "通讯录联系人已通过",
          content: expect.stringContaining("已通过审核"),
          refId: CUID(1),
        })
      );
    });
  });

  describe("rejectExternalContact", () => {
    it("should reject pending contact", async () => {
      mockIsManager.mockReturnValue(true);
      mockPrisma.externalContact.findUnique.mockResolvedValue({
        id: CUID(1),
        name: "Pending",
        status: "PENDING_REVIEW",
        createdById: "u2",
      });
      mockPrisma.externalContact.update.mockResolvedValue({
        id: CUID(1),
        status: "REJECTED",
      });

      await rejectExternalContact({ id: CUID(1), note: "Invalid" });

      expect(mockPrisma.externalContact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "REJECTED",
            reviewNote: "Invalid",
          }),
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "EXTERNAL_CONTACT_REJECT",
          detail: { note: "Invalid" },
        })
      );
    });

    it("should notify creator with rejection reason", async () => {
      mockIsManager.mockReturnValue(true);
      mockPrisma.externalContact.findUnique.mockResolvedValue({
        id: CUID(1),
        name: "Pending",
        status: "PENDING_REVIEW",
        createdById: "u2",
      });
      mockPrisma.externalContact.update.mockResolvedValue({
        id: CUID(1),
        status: "REJECTED",
      });

      await rejectExternalContact({ id: CUID(1), note: "Wrong info" });

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u2",
          title: "通讯录联系人未通过",
          content: expect.stringContaining("Wrong info"),
        })
      );
    });
  });

  describe("archiveExternalContact", () => {
    it("should set archivedAt", async () => {
      // Use ADMIN role to satisfy assertCanModify
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "ADMIN" },
      } as any);
      mockPrisma.externalContact.findUnique.mockResolvedValue({
        id: CUID(1),
        createdById: "u2",
      });
      mockPrisma.externalContact.update.mockResolvedValue({ id: CUID(1) });

      await archiveExternalContact(CUID(1));

      expect(mockPrisma.externalContact.update).toHaveBeenCalledWith({
        where: { id: CUID(1) },
        data: { archivedAt: expect.any(Date) },
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "EXTERNAL_CONTACT_ARCHIVE",
        })
      );
    });

    it("should respect assertCanModify permission", async () => {
      mockPrisma.externalContact.findUnique.mockResolvedValue({
        id: CUID(1),
        createdById: "u2",
      });
      // will throw from assertCanModify
      await expect(archiveExternalContact(CUID(1))).rejects.toThrow(
        "无权修改此联系人"
      );
    });
  });
});
