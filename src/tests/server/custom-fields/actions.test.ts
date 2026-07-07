import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listCustomFieldDefs,
  createCustomFieldDef,
  updateCustomFieldDef,
  toggleCustomFieldDef,
  deleteCustomFieldDef,
  saveMatterCustomValues
} from "@/server/custom-fields/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanLeadMatter } from "@/lib/permissions";


vi.mock("@/lib/prisma");
vi.mock("@/lib/auth/session");
vi.mock("@/server/audit");
vi.mock("next/cache");
vi.mock("@/lib/archive/guard");
vi.mock("@/lib/permissions");

const mockPrisma = vi.mocked(prisma, true);
const mockRequireSession = vi.mocked(requireSession);
const mockAudit = vi.mocked(audit);
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockAssertMatterWritable = vi.mocked(assertMatterWritable);
const mockAssertCanLeadMatter = vi.mocked(assertCanLeadMatter);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "LAWYER", name: "User" }
  } as any);
  mockPrisma.customFieldDef = {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn()
  } as any;
  mockPrisma.matter = { update: vi.fn() } as any;
});

describe("custom-fields actions", () => {
  describe("listCustomFieldDefs", () => {
    it("should list defs for entity", async () => {
      const mockDefs = [{ id: "d1" }] as any;
      mockPrisma.customFieldDef.findMany.mockResolvedValue(mockDefs);

      const result = await listCustomFieldDefs("MATTER", false);

      expect(result).toBe(mockDefs);
      expect(mockPrisma.customFieldDef.findMany).toHaveBeenCalledWith({
        where: { entityType: "MATTER" },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }]
      });
    });

    it("should filter onlyEnabled", async () => {
      await listCustomFieldDefs("CLIENT", true);
      expect(mockPrisma.customFieldDef.findMany).toHaveBeenCalledWith({
        where: { entityType: "CLIENT", enabled: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }]
      });
    });
  });

  describe("createCustomFieldDef", () => {
    const validInput = {
      entityType: "MATTER" as const,
      label: "Test Field",
      fieldType: "TEXT" as const,
      options: [],
      required: false
    };

    it("should create as ADMIN", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "admin", role: "ADMIN", name: "Admin" }
      } as any);
      mockPrisma.customFieldDef.aggregate.mockResolvedValue({
        _max: { order: 5 },
        _min: undefined,
        _avg: undefined,
        _sum: undefined,
        _count: { _all: 0 }
      });
      mockPrisma.customFieldDef.create.mockResolvedValue({
        id: "newDef",
        key: "cf_abcd1234",
        ...validInput,
        order: 6
      } as any);

      const result = await createCustomFieldDef(validInput as any);

      expect(result).toEqual({ ok: true, id: "newDef" });
      expect(mockPrisma.customFieldDef.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          key: expect.stringMatching(/^cf_/),
          label: "Test Field",
          fieldType: "TEXT",
          order: 6
        })
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CUSTOM_FIELD_CREATE",
          targetType: "CustomFieldDef",
          targetId: "newDef"
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/settings/custom-fields");
    });

    it("should reject non-ADMIN", async () => {
      await expect(createCustomFieldDef(validInput as any)).rejects.toThrow(
        "仅管理员可管理自定义字段"
      );
    });

    it("should require options for SELECT", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "admin", role: "ADMIN", name: "Admin" }
      } as any);
      const input = { ...validInput, fieldType: "SELECT", options: [] };
      await expect(createCustomFieldDef(input as any)).rejects.toThrow(
        "下拉类型至少需要一个选项值"
      );
    });
  });

  describe("updateCustomFieldDef", () => {
    it("should update def", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "admin", role: "ADMIN", name: "Admin" }
      } as any);
      const defId = "cjx4omfcw0000ml5tyivrzcse"; // valid cuid
      const input = {
        id: defId,
        label: "Updated",
        fieldType: "NUMBER" as const,
        options: undefined,
        required: true
      } as any;

      await updateCustomFieldDef(input);

      expect(mockPrisma.customFieldDef.update).toHaveBeenCalledWith({
        where: { id: defId },
        data: {
          label: "Updated",
          fieldType: "NUMBER",
          required: true
        }
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CUSTOM_FIELD_UPDATE",
          targetType: "CustomFieldDef",
          targetId: defId
        })
      );
    });
  });

  describe("toggleCustomFieldDef", () => {
    it("should toggle enabled", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "admin", role: "ADMIN", name: "Admin" }
      } as any);

      await toggleCustomFieldDef("def2", false);

      expect(mockPrisma.customFieldDef.update).toHaveBeenCalledWith({
        where: { id: "def2" },
        data: { enabled: false }
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/settings/custom-fields");
    });
  });

  describe("deleteCustomFieldDef", () => {
    it("should delete def", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "admin", role: "ADMIN", name: "Admin" }
      } as any);

      await deleteCustomFieldDef("def3");

      expect(mockPrisma.customFieldDef.delete).toHaveBeenCalledWith({
        where: { id: "def3" }
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CUSTOM_FIELD_DELETE",
          targetType: "CustomFieldDef",
          targetId: "def3"
        })
      );
    });
  });

  describe("saveMatterCustomValues", () => {
    it("should save values after validation", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u2", role: "LAWYER", name: "User" }
      } as any);
      mockAssertMatterWritable.mockResolvedValue(undefined as any);
      mockAssertCanLeadMatter.mockResolvedValue(undefined as any);
      mockPrisma.customFieldDef.findMany.mockResolvedValue([
        { key: "cf1", label: "Field 1", required: false },
        { key: "cf2", label: "Field 2", required: true }
      ] as any);
      mockPrisma.matter.update.mockResolvedValue({} as any);

      const matterId = "m123";
      const values = { cf1: "Value1", cf2: "Value2" };

      await saveMatterCustomValues(matterId, values);

      expect(mockPrisma.matter.update).toHaveBeenCalledWith({
        where: { id: matterId },
        data: { customValues: { cf1: "Value1", cf2: "Value2" } }
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "MATTER_CUSTOM_VALUES",
          targetType: "Matter",
          targetId: matterId
        })
      );
    });

    it("should enforce required fields", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u2", role: "LAWYER", name: "User" }
      } as any);
      mockAssertMatterWritable.mockResolvedValue(undefined as any);
      mockAssertCanLeadMatter.mockResolvedValue(undefined as any);
      mockPrisma.customFieldDef.findMany.mockResolvedValue([
        { key: "cf1", label: "Field 1", required: true }
      ] as any);

      await expect(
        saveMatterCustomValues("m123", { cf1: "" })
      ).rejects.toThrow("「Field 1」为必填项");
    });

    it("should filter out non-enabled defs keys", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u2", role: "LAWYER", name: "User" }
      } as any);
      mockAssertMatterWritable.mockResolvedValue(undefined as any);
      mockAssertCanLeadMatter.mockResolvedValue(undefined as any);
      mockPrisma.customFieldDef.findMany.mockResolvedValue([
        { key: "cf1", label: "Field 1", required: false }
      ] as any);
      mockPrisma.matter.update.mockResolvedValue({} as any);

      await saveMatterCustomValues("m123", { cf1: "V", extra: "ignored" });

      expect(mockPrisma.matter.update).toHaveBeenCalledWith({
        where: { id: "m123" },
        data: { customValues: { cf1: "V" } }
      });
    });
  });
});