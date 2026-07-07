// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listStageTemplates,
  upsertStageTemplate,
  listAuditLogs,
} from "@/server/settings/actions";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session");
vi.mock("@/server/audit");
vi.mock("next/cache");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    stageTemplate: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
  },
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockAudit = vi.mocked(audit, true);
const mockRevalidatePath = vi.mocked(revalidatePath, true);
const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  // default: non-admin
  mockRequireSession.mockResolvedValue({
    user: { id: CUID(1), role: "LAWYER" },
  } as any);
});

const CUID = (n: number) => `c${n.toString().padStart(24, "0")}`;

describe("settings/actions", () => {
  describe("listStageTemplates", () => {
    it("should require admin", async () => {
      await expect(listStageTemplates()).rejects.toThrow("仅管理员可执行");
    });

    it("should list all templates ordered by procedureType", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "ADMIN" },
      } as any);
      const templates = [
        { id: "t1", procedureType: "FIRST_INSTANCE", name: "T1", steps: [], isDefault: true },
        { id: "t2", procedureType: "SECOND_INSTANCE", name: "T2", steps: [], isDefault: false },
      ];
      mockPrisma.stageTemplate.findMany.mockResolvedValue(templates);

      const result = await listStageTemplates();

      expect(mockPrisma.stageTemplate.findMany).toHaveBeenCalledWith({
        orderBy: { procedureType: "asc" },
      });
      expect(result).toEqual(templates);
    });
  });

  describe("upsertStageTemplate", () => {
    const baseInput = {
      procedureType: "FIRST_INSTANCE",
      name: "Default Template",
      steps: [
        { name: "Step 1", order: 1, defaultTasks: [] },
      ],
    };

    it("should require admin", async () => {
      await expect(upsertStageTemplate(baseInput as any)).rejects.toThrow("仅管理员可执行");
    });

    it("should create new default template", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "ADMIN" },
      } as any);
      const input = { ...baseInput };
      const id = `default-${input.procedureType}`;
      mockPrisma.stageTemplate.upsert.mockResolvedValue({
        id,
        procedureType: input.procedureType as any,
        name: input.name,
        isDefault: true,
        steps: input.steps,
      });

      const result = await upsertStageTemplate(input as any);

      expect(mockPrisma.stageTemplate.upsert).toHaveBeenCalledWith({
        where: { id },
        update: {
          name: input.name,
          steps: input.steps as unknown as object,
        },
        create: {
          id,
          procedureType: input.procedureType as any,
          name: input.name,
          isDefault: true,
          steps: input.steps as unknown as object,
        },
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: CUID(1),
          action: "STAGE_TEMPLATE_UPDATE",
          targetType: "StageTemplate",
          targetId: id,
          detail: { procedureType: input.procedureType, stepCount: 1 },
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/settings/templates");
      expect(result).toEqual({ ok: true });
    });

    it("should update existing template", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "ADMIN" },
      } as any);
      const input = { ...baseInput, name: "Updated Name" };
      const id = `default-${input.procedureType}`;
      mockPrisma.stageTemplate.upsert.mockResolvedValue({
        id,
        name: input.name,
        isDefault: true,
        steps: input.steps,
      });

      await upsertStageTemplate(input as any);

      expect(mockPrisma.stageTemplate.upsert).toHaveBeenCalledWith({
        where: { id },
        update: {
          name: input.name,
          steps: input.steps as unknown as object,
        },
        create: expect.anything(),
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: CUID(1),
          action: "STAGE_TEMPLATE_UPDATE",
          targetType: "StageTemplate",
          targetId: id,
          detail: { procedureType: input.procedureType, stepCount: 1 },
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/settings/templates");
    });

    it("should validate step name max length", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "ADMIN" },
      } as any);
      const input = {
        procedureType: "FIRST_INSTANCE",
        name: "Valid Name",
        steps: [{ name: "x".repeat(41), order: 1, defaultTasks: [] }],
      };

      await expect(upsertStageTemplate(input as any)).rejects.toThrow();
    });

    it("should validate step order range", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "ADMIN" },
      } as any);
      const input = {
        procedureType: "FIRST_INSTANCE",
        name: "Valid",
        steps: [{ name: "Step", order: 0, defaultTasks: [] }],
      };

      await expect(upsertStageTemplate(input as any)).rejects.toThrow();
    });

    it("should validate at least one step", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "ADMIN" },
      } as any);
      const input = {
        procedureType: "FIRST_INSTANCE",
        name: "Valid",
        steps: [],
      };

      await expect(upsertStageTemplate(input as any)).rejects.toThrow();
    });
  });

  describe("listAuditLogs", () => {
    const mockAuditItems = [
      {
        id: CUID(1),
        userId: CUID(2),
        action: "USER_LOGIN",
        createdAt: new Date(),
        user: { id: CUID(2), name: "John Doe" },
      },
    ];

    it("should require admin", async () => {
      await expect(listAuditLogs()).rejects.toThrow("仅管理员可执行");
    });

    it("should list default logs with distinct actions", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "ADMIN" },
      } as any);
      mockPrisma.auditLog.findMany
        .mockResolvedValueOnce(mockAuditItems)
        .mockResolvedValueOnce([{ action: "USER_LOGIN" }]);

      const result = await listAuditLogs();

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledTimes(2);
      const [itemsCall, distinctCall] = mockPrisma.auditLog.findMany.mock.calls;
      // items call expectations
      expect(itemsCall[0].where).toMatchObject({
        createdAt: expect.any(Object),
      });
      expect(itemsCall[0].orderBy).toEqual({ createdAt: "desc" });
      expect(itemsCall[0].take).toBe(200);
      expect(itemsCall[0].include).toEqual({
        user: { select: { id: true, name: true } },
      });
      // distinct call expectations
      expect(distinctCall[0].where).toMatchObject({
        createdAt: expect.any(Object),
      });
      expect(distinctCall[0].select).toEqual({ action: true });
      expect(distinctCall[0].distinct).toEqual(["action"]);
      expect(distinctCall[0].orderBy).toEqual({ action: "asc" });
      expect(distinctCall[0].take).toBe(200);

      expect(result).toEqual({
        items: mockAuditItems,
        distinctActions: ["USER_LOGIN"],
      });
    });

    it("should filter by action and userId", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "ADMIN" },
      } as any);
      mockPrisma.auditLog.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const query = {
        action: "login",
        userId: CUID(2),
        days: 7,
        limit: 50,
      } as any;

      await listAuditLogs(query);

      const [itemsCall, distinctCall] = mockPrisma.auditLog.findMany.mock.calls;
      // items call should include filters and limit
      expect(itemsCall[0].where).toMatchObject({
        action: { contains: "login", mode: "insensitive" },
        userId: CUID(2),
        createdAt: expect.any(Object),
      });
      expect(itemsCall[0].take).toBe(50);
      // distinct call where should also include filters
      expect(distinctCall[0].where).toMatchObject({
        action: { contains: "login", mode: "insensitive" },
        userId: CUID(2),
        createdAt: expect.any(Object),
      });
      // distinct call specific options
      expect(distinctCall[0].select).toEqual({ action: true });
      expect(distinctCall[0].distinct).toEqual(["action"]);
      expect(distinctCall[0].orderBy).toEqual({ action: "asc" });
      expect(distinctCall[0].take).toBe(200);
    });

    it("should validate days and limit defaults", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "ADMIN" },
      } as any);
      mockPrisma.auditLog.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await listAuditLogs(); // empty input -> defaults

      const [itemsCall] = mockPrisma.auditLog.findMany.mock.calls;
      expect(itemsCall[0].take).toBe(200);
    });

    it("should reject negative days", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "ADMIN" },
      } as any);
      await expect(listAuditLogs({ days: 0 } as any)).rejects.toThrow();
    });

    it("should reject limit > 500", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "ADMIN" },
      } as any);
      await expect(listAuditLogs({ limit: 600 } as any)).rejects.toThrow();
    });

    it("should handle empty items and distinct", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "ADMIN" },
      } as any);
      mockPrisma.auditLog.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await listAuditLogs();

      expect(result).toEqual({ items: [], distinctActions: [] });
    });
  });
});
