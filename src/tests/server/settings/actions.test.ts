import { describe, it, expect, vi, beforeEach } from "vitest";
import { listStageTemplates, listAuditLogs, upsertStageTemplate } from "@/server/settings/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stageTemplate: {
      findMany: vi.fn(),
      upsert: vi.fn()
    },
    auditLog: {
      findMany: vi.fn()
    }
  }
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/server/audit");
vi.mock("next/cache");

const mockPrisma = vi.mocked(prisma, true);
const mockRequireSession = vi.mocked(requireSession);
const mockAudit = vi.mocked(audit);
const mockRevalidatePath = vi.mocked(revalidatePath);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN", name: "Admin" } });
});

describe("settings actions", () => {
  it("listStageTemplates should return all templates ordered by procedureType", async () => {
    const mockTemplates = [
      { id: "t1", procedureType: "CIVIL", name: "Civil Template" },
      { id: "t2", procedureType: "CRIMINAL", name: "Criminal Template" }
    ] as any;
    mockPrisma.stageTemplate.findMany.mockResolvedValue(mockTemplates);

    const result = await listStageTemplates();

    expect(result).toEqual(mockTemplates);
    expect(mockPrisma.stageTemplate.findMany).toHaveBeenCalledWith({
      orderBy: { procedureType: "asc" }
    });
  });

  describe("listAuditLogs", () => {
    it("should list audit logs", async () => {
      const mockLogs = [{ id: "a1" }] as any;
      const mockDistinct = [] as any;
      mockPrisma.auditLog.findMany
        .mockResolvedValueOnce(mockLogs)
        .mockResolvedValueOnce(mockDistinct);

      const result = await listAuditLogs({});

      expect(result).toEqual({ items: mockLogs, distinctActions: [] });
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe("upsertStageTemplate", () => {
    it("should upsert stage template", async () => {
      const input = {
        procedureType: "CIVIL",
        name: "Civil Template",
        steps: [{ name: "Step1", order: 1, defaultTasks: [] }]
      } as any;
      mockPrisma.stageTemplate.upsert.mockResolvedValue({} as any);

      await upsertStageTemplate(input);

      expect(mockPrisma.stageTemplate.upsert).toHaveBeenCalledWith({
        where: { id: `default-${input.procedureType}` },
        update: {
          name: input.name,
          steps: input.steps as unknown as object
        },
        create: {
          id: `default-${input.procedureType}`,
          procedureType: input.procedureType as any,
          name: input.name,
          isDefault: true,
          steps: input.steps as unknown as object
        }
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "STAGE_TEMPLATE_UPDATE",
          targetId: `default-${input.procedureType}`,
          detail: { procedureType: input.procedureType, stepCount: 1 }
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/settings/templates");
    });
  });
});