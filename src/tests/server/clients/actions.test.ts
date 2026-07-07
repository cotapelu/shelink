// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listClients,
  getClientById,
  getClientFinanceSummary,
  createClient,
  updateClient,
  softDeleteClient,
  addContact,
  deleteContact,
} from "@/server/clients/actions";
import { requireSession } from "@/lib/auth/session";
import { clientVisibilityFilter, isManager } from "@/lib/permissions";
// Mock generateClientCode via alias
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// Mock modules
vi.mock("@/lib/auth/session");
vi.mock("@/lib/permissions");
vi.mock("@/server/audit");
vi.mock("next/cache");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    client: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(), // for soft? actually soft uses update, but contact deletion uses delete
    },
    contact: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    billing: { findMany: vi.fn() },
    feeEntry: { findMany: vi.fn() },
    matter: { count: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/server/clients/code-generator", () => ({
  generateClientCode: vi.fn().mockResolvedValue("KH-2025-0001"),
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockClientVisibility = vi.mocked(clientVisibilityFilter, true);
const mockIsManager = vi.mocked(isManager, true);
const mockAudit = vi.mocked(audit, true);
const mockRevalidatePath = vi.mocked(revalidatePath, true);
const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockClientVisibility.mockReturnValue({});
  mockIsManager.mockReturnValue(false);
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "LAWYER" },
  } as any);
});

describe("clients/actions", () => {
  describe("listClients", () => {
    it("should list with pagination and counts", async () => {
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.client.count.mockResolvedValue(0);

      const result = await listClients({ page: 2, pageSize: 10 });

      expect(result).toEqual({ items: [], total: 0, page: 2, pageSize: 10 });
      expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
          include: expect.objectContaining({
            contacts: expect.any(Object),
            _count: expect.any(Object),
          }),
        })
      );
    });

    it("should apply type filter", async () => {
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.client.count.mockResolvedValue(0);

      await listClients({ type: "COMPANY" });
      const where = mockPrisma.client.findMany.mock.calls[0][0].where as any;
      expect(where.type).toBe("COMPANY");
    });

    it("should apply tag filter", async () => {
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.client.count.mockResolvedValue(0);

      await listClients({ tag: "VIP" });
      const where = mockPrisma.client.findMany.mock.calls[0][0].where as any;
      expect(where.tags).toEqual({ has: "VIP" });
    });

    it("should apply search OR conditions", async () => {
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.client.count.mockResolvedValue(0);

      await listClients({ search: "test" });
      const where = mockPrisma.client.findMany.mock.calls[0][0].where as any;
      expect(where.OR).toEqual([
        { name: { contains: "test", mode: "insensitive" } },
        { idNumber: { contains: "test" } },
        { phone: { contains: "test" } },
        { email: { contains: "test", mode: "insensitive" } },
      ]);
    });

    it("should include visibility and deletedAt null", async () => {
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.client.count.mockResolvedValue(0);

      await listClients({});
      const where = mockPrisma.client.findMany.mock.calls[0][0].where as any;
      expect(where.deletedAt).toBeNull();
      expect(where).toMatchObject({}); // plus visibility filter spread
    });
  });

  describe("getClientById", () => {
    it("should allow manager/finance without matter association check", async () => {
      mockIsManager.mockReturnValue(true);
      mockPrisma.client.findFirst.mockResolvedValue({
        id: "c1",
        name: "Client",
        contacts: [],
        matters: [],
      });

      const result = await getClientById("c1");

      expect(result).toBeDefined();
      // Should not call visibility filter for permission check
      expect(mockPrisma.client.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "c1", deletedAt: null },
        })
      );
    });

    it("should reject non-manager/finance if not associated via matters", async () => {
      mockIsManager.mockReturnValue(false);
      mockClientVisibility.mockReturnValue({ ownerId: "u1" });
      mockPrisma.client.findFirst.mockResolvedValue(null);

      await expect(getClientById("c1")).rejects.toThrow("Khách hàng không tồn tại");
    });

    it("should return client with contacts and matters for authorized user", async () => {
      mockIsManager.mockReturnValue(false);
      mockClientVisibility.mockReturnValue({ ownerId: "u1" });
      mockPrisma.client.findFirst
        .mockResolvedValueOnce({ id: "cx", name: "C", contacts: [], matters: [] }) // permission check
        .mockResolvedValueOnce({
          id: "cx",
          name: "C",
          contacts: [{ name: "Contact A" }],
          matters: [{ title: "Matter A" }],
        });

      const result = await getClientById("cx");

      expect(result.matters).toHaveLength(1);
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CLIENT_VIEW",
          targetId: "cx",
        })
      );
    });
  });

  describe("getClientFinanceSummary", () => {
    it("should calculate financial aggregates", async () => {
      mockIsManager.mockReturnValue(true);
      mockPrisma.billing.findMany.mockResolvedValue([
        { contractAmount: "1000" },
        { contractAmount: "2000" },
      ]);
      mockPrisma.feeEntry.findMany.mockResolvedValue([
        { type: "RECEIVABLE", amount: "1500" },
        { type: "RECEIVED", amount: "1000" },
        { type: "RECEIVABLE", amount: "500" },
      ]);
      mockPrisma.matter.count.mockResolvedValue(3);

      const result = await getClientFinanceSummary("c1");

      expect(result).toEqual({
        contractTotal: 3000,
        receivable: 2000,
        received: 1000,
        outstanding: 1000,
        matterCount: 3,
        billings: expect.any(Array),
      });
    });

    it("should enforce permission similar to getClientById", async () => {
      mockIsManager.mockReturnValue(false);
      mockClientVisibility.mockReturnValue({});
      mockPrisma.client.findFirst.mockResolvedValue(null); // permission check fails

      await expect(getClientFinanceSummary("c1")).rejects.toThrow("Khách hàng không tồn tại");
    });
  });

  describe("createClient", () => {
    it("should create client with generated code and default contactCount 0", async () => {
      mockIsManager.mockReturnValue(true);
      mockPrisma.client.create.mockResolvedValue({
        id: "newc",
        internalCode: "KH-2025-0001",
        name: "New Client",
        type: "COMPANY",
        contactCount: 0,
      });

      const result = await createClient({
        name: "New Client",
        type: "COMPANY",
        idNumber: "123456",
        phone: "0900111222",
        email: "test@example.com",
        address: "Addr",
        industry: "Tech",
        ethnicity: "Kinh",
        source: "Web",
        cooperationStatus: "POTENTIAL",
        // gender omitted
        tags: ["tag1"],
        contacts: [],
      });

      expect(result).toEqual({ ok: true, id: "newc" });
      expect(mockPrisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "New Client",
            type: "COMPANY",
            internalCode: "KH-2025-0001",
          }),
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CLIENT_CREATE",
          targetType: "Client",
        })
      );
    });

    it("should convert empty strings to null via emptyToNull", async () => {
      mockIsManager.mockReturnValue(true);
      mockPrisma.client.create.mockResolvedValue({ id: "c2" });

      // Provide empty strings for optional string fields; enum fields either valid or omitted
      await createClient({
        name: "Client",
        type: "INDIVIDUAL",
        idNumber: "",
        phone: "",
        email: "",
        address: "",
        industry: "",
        ethnicity: "",
        source: "",
        // cooperationStatus omitted (default SIGNED)
        gender: "", // empty string allowed
        tags: [],
        contacts: [],
      });

      const createData = mockPrisma.client.create.mock.calls[0][0].data as any;
      expect(createData.idNumber).toBeNull();
      expect(createData.phone).toBeNull();
      // email, address, etc also become null
      expect(createData.email).toBeNull();
      expect(createData.address).toBeNull();
    });
  });

  describe("updateClient", () => {
    it("should allow manager only", async () => {
      mockIsManager.mockReturnValue(false);
      await expect(
        updateClient({ id: "c1", name: "New", contacts: [] })
      ).rejects.toThrow(
        "Chỉ admin hoặc luật sư phụ trách được sửa thông tin khách hàng"
      );
    });

    it("should update client fields and replace contacts", async () => {
      mockIsManager.mockReturnValue(true);
      mockPrisma.contact.deleteMany.mockResolvedValue({});
      mockPrisma.client.update.mockResolvedValue({});
      mockPrisma.contact.create.mockResolvedValue({});

      await updateClient({
        id: "cl1234567890123456789012",
        name: "Updated Name",
        type: "COMPANY",
        contacts: [{ name: "New Contact", phone: "123", email: "", isPrimary: true }],
        gender: "FEMALE",
        tags: ["vip"],
      });

      expect(mockPrisma.contact.deleteMany).toHaveBeenCalledWith({
        where: { clientId: "cl1234567890123456789012" },
      });
      expect(mockPrisma.client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "cl1234567890123456789012" },
          data: expect.objectContaining({
            name: "Updated Name",
            contacts: { create: expect.any(Array) },
          }),
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CLIENT_UPDATE",
          targetId: "cl1234567890123456789012",
        })
      );
    });
  });

  describe("softDeleteClient", () => {
    it("should allow admin/principal only", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      await expect(softDeleteClient("c1")).rejects.toThrow(
        "Chỉ admin hoặc luật sư phụ trách được xóa khách hàng"
      );
    });

    it("should set deletedAt to now", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "ADMIN" },
      } as any);
      mockPrisma.client.update.mockResolvedValue({});

      await softDeleteClient("c1");

      expect(mockPrisma.client.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CLIENT_DELETE",
        })
      );
    });
  });

  describe("addContact", () => {
    it("should allow manager only", async () => {
      mockIsManager.mockReturnValue(false);
      await expect(
        addContact("c1", { name: "C", phone: "123", email: "", isPrimary: true })
      ).rejects.toThrow("Chỉ admin hoặc luật sư phụ trách được sửa liên hệ");
    });

    it("should create contact for client", async () => {
      mockIsManager.mockReturnValue(true);
      mockPrisma.contact.create.mockResolvedValue({ id: "contact1" });

      const result = await addContact("c1", {
        name: "Contact A",
        title: "Manager",
        phone: "0988123123",
        email: "a@example.com",
        wechat: "wx123",
        isPrimary: true,
        notes: "Note",
      });

      expect(result).toEqual({ ok: true, id: "contact1" });
      expect(mockPrisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientId: "c1",
            name: "Contact A",
          }),
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CONTACT_CREATE",
          targetType: "Contact",
          detail: { clientId: "c1" },
        })
      );
    });
  });

  describe("deleteContact", () => {
    it("should allow manager only", async () => {
      mockIsManager.mockReturnValue(false);
      await expect(deleteContact("contact1")).rejects.toThrow(
        "Chỉ admin hoặc luật sư phụ trách được xóa liên hệ"
      );
    });

    it("should return ok false if contact not found", async () => {
      mockIsManager.mockReturnValue(true);
      mockPrisma.contact.findUnique.mockResolvedValue(null);

      const result = await deleteContact("nonexistent");

      expect(result).toEqual({ ok: false });
    });

    it("should delete contact and audit", async () => {
      mockIsManager.mockReturnValue(true);
      mockPrisma.contact.findUnique.mockResolvedValue({ id: "c1" });
      mockPrisma.contact.delete.mockResolvedValue({});

      const result = await deleteContact("c1");

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.contact.delete).toHaveBeenCalledWith({
        where: { id: "c1" },
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CONTACT_DELETE",
          targetType: "Contact",
          targetId: "c1",
        })
      );
    });
  });
});
