import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  runCheckAndSave,
  setConflictConclusion
} from "@/server/conflicts/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { matterAssociationFilter } from "@/lib/permissions";
import { runConflictCheck } from "@/server/conflicts/algorithm";

vi.mock("@/lib/prisma");
vi.mock("@/lib/auth/session");
vi.mock("@/server/audit");
vi.mock("next/cache");
vi.mock("@/lib/permissions");
vi.mock("@/server/conflicts/algorithm");

const mockPrisma = vi.mocked(prisma, true);
const mockRequireSession = vi.mocked(requireSession);
const mockAudit = vi.mocked(audit);
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockMatterAssociationFilter = vi.mocked(matterAssociationFilter);
const mockRunConflictCheck = vi.mocked(runConflictCheck);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "LAWYER", name: "User" }
  } as any);
  mockMatterAssociationFilter.mockReturnValue({});
  mockPrisma.conflictCheck = {
    create: vi.fn(),
    update: vi.fn()
  } as any;
  mockPrisma.matter = { findMany: vi.fn() } as any;
});

describe("conflicts actions", () => {
  describe("runCheckAndSave", () => {
    it("should auto-conclude when no hits", async () => {
      const intakeId = "cjx4omfcw0000ml5tyivrzcse";
      mockRunConflictCheck.mockResolvedValue({
        hits: [],
        sameNameClients: [],
        idMatchedClients: []
      } as any);
      mockPrisma.conflictCheck.create.mockResolvedValue({
        id: "cc1",
        hits: [],
        intakeId
      } as any);

      const result = await runCheckAndSave({
        intakeId,
        queries: [{ role: "OPPOSING_PARTY", name: "Test", idNumber: "" }]
      });

      expect(result.ok).toBe(true);
      expect(result.hits).toEqual([]);

      const createCall = mockPrisma.conflictCheck.create.mock.calls[0][0];
      expect(createCall.data.intakeId).toBe(intakeId);
      expect(createCall.data.conclusion).toBe("DIFFERENT");
      expect(createCall.data.decidedById).toBe("u1");
      expect(createCall.data.hits.create).toEqual([]);
      expect(createCall.data.note).toBe("系统自动标记：未命中历史案件冲突。");
      // audit should include hitCount 0 and autoConclusion DIFFERENT
      const auditCall = mockAudit.mock.calls[0][0];
      expect(auditCall.action).toBe("CONFLICT_CHECK_RUN");
      expect(auditCall.detail.hitCount).toBe(0);
      expect(auditCall.detail.autoConclusion).toBe("DIFFERENT");
    });

    it("should create pending check with hits", async () => {
      const intakeId = "cjx4omfcw0000ml5tyivrzcse";
      const mockHits = [
        {
          hitType: "some",
          targetType: "Matter",
          targetId: "m1",
          matchedName: "Test",
          matchedField: "name",
          matchedValue: "Test",
          matchedRatio: 0.9,
          severity: "HIGH",
          reason: "match",
          matterInfo: { matterId: "m1", title: "Matter 1", status: "ACTIVE" }
        }
      ] as any;
      mockRunConflictCheck.mockResolvedValue({
        hits: mockHits,
        sameNameClients: [],
        idMatchedClients: []
      } as any);
      mockPrisma.matter.findMany.mockResolvedValue([{ id: "m1" }] as any);
      mockPrisma.conflictCheck.create.mockResolvedValue({
        id: "cc2",
        hits: [{ id: "h1", targetType: "Matter", targetId: "m1" }] as any,
        intakeId
      } as any);

      const result = await runCheckAndSave({
        intakeId,
        queries: [{ name: "Test", idNumber: "" }]
      });

      expect(result.ok).toBe(true);
      expect(result.hits).toHaveLength(1);
      // Verify hit is sanitized: targetId not empty, and check revalidation
      expect(result.hits[0].targetId).toBe("m1");
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/intakes/${intakeId}`);
    });
  });

  describe("setConflictConclusion", () => {
    const checkId = "cjx4omfcw0000ml5tyivrzcse"; // valid cuid

    it("should set conclusion", async () => {
      mockPrisma.conflictCheck.update.mockResolvedValue({
        id: checkId,
        intake: { id: "intake1" }
      } as any);

      const result = await setConflictConclusion({
        checkId,
        conclusion: "SAME_SUBJECT",
        note: "Contested"
      });

      expect(result).toEqual({ ok: true });
      const updateCall = mockPrisma.conflictCheck.update.mock.calls[0][0];
      expect(updateCall.where.id).toBe(checkId);
      expect(updateCall.data.conclusion).toBe("SAME_SUBJECT");
      expect(updateCall.data.decidedById).toBe("u1");
      expect(updateCall.data.note).toBe("Contested");
      expect(updateCall.include).toEqual({ intake: { select: { id: true } } });

      const auditCall = mockAudit.mock.calls[0][0];
      expect(auditCall.action).toBe("CONFLICT_CONCLUSION_SET");
      expect(auditCall.targetId).toBe(checkId);
      expect(auditCall.detail.conclusion).toBe("SAME_SUBJECT");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/intakes/intake1");
    });

    it("should handle null note and no intake", async () => {
      mockPrisma.conflictCheck.update.mockResolvedValue({
        id: checkId,
        intake: null
      } as any);

      await setConflictConclusion({
        checkId,
        conclusion: "DIFFERENT",
        note: ""
      });

      const updateCall = mockPrisma.conflictCheck.update.mock.calls[0][0];
      expect(updateCall.data.note).toBeNull();
    });
  });
});