// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  archiveMatter,
  approveArchiveRecord,
  rejectArchiveRecord,
  batchApproveArchiveRecords,
  batchRejectArchiveRecords,
  type ArchiveSubmitInput
} from "@/server/archive/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { createNotification } from "@/server/notifications/create";
import { checklistForCategory, evaluateChecklist } from "@/lib/archive/checklists";
import { nextArchiveNo } from "@/lib/archive/archive-no";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanLeadMatter } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { renderArchiveCover, renderArchiveCatalog } from "@/server/archive/render";

// Mock all dependencies
vi.mock("@/lib/prisma", () => {
  const db: any = {
    matter: { findUnique: vi.fn(), update: vi.fn() },
    archiveRecord: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
    timelineEvent: { create: vi.fn() },
    document: { update: vi.fn() }
  };
  db.$transaction = vi.fn().mockImplementation(async (cb: any) => await cb(db));
  return { prisma: db };
});

vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/server/audit");
vi.mock("@/server/notifications/create");
vi.mock("@/lib/archive/checklists");
vi.mock("@/lib/archive/archive-no");
vi.mock("@/lib/archive/guard");
vi.mock("@/lib/permissions");
vi.mock("next/cache");
vi.mock("@/server/archive/render", () => ({
  renderArchiveCover: vi.fn().mockResolvedValue("cover-doc-id"),
  renderArchiveCatalog: vi.fn().mockResolvedValue("catalog-doc-id")
}));
vi.mock("@/server/archive/schemas", () => ({
  archiveSubmitSchema: { parse: vi.fn((v) => v) },
  CLOSED_REASON_CN: { JUDGMENT: "判决", MEDIATION: "调解", WITHDRAWAL: "撤回", SETTLEMENT: "和解", RULING: "裁定", OTHER: "其他" }
}));

const mockPrisma = vi.mocked(prisma, true);
const mockRequireSession = vi.mocked(requireSession);
const mockAudit = vi.mocked(audit);
const mockCreateNotification = vi.mocked(createNotification);
const mockChecklistForCategory = vi.mocked(checklistForCategory);
const mockEvaluateChecklist = vi.mocked(evaluateChecklist);
const mockNextArchiveNo = vi.mocked(nextArchiveNo);
const mockAssertMatterWritable = vi.mocked(assertMatterWritable);
const mockAssertCanLeadMatter = vi.mocked(assertCanLeadMatter);
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockRenderArchiveCover = vi.mocked(renderArchiveCover);
const mockRenderArchiveCatalog = vi.mocked(renderArchiveCatalog);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "user-1", name: "Test User", role: "LAWYER" } });
});

describe("server/archive/actions", () => {
  describe("archiveMatter", () => {
    const validInput: ArchiveSubmitInput = {
      matterId: "matter-1",
      summary: "Test summary",
      checklist: {},
      closedReason: "JUDGMENT",
      completedAt: new Date(),
      judgmentSummary: "Summary",
      forceWithMissing: false
    };

    it("should reject if matter not found", async () => {
      mockPrisma.matter.findUnique.mockResolvedValue(null);
      await expect(archiveMatter(validInput)).rejects.toThrow("案件不存在");
    });

    it("should reject if matter already archived", async () => {
      mockPrisma.matter.findUnique.mockResolvedValue({
        id: "matter-1",
        status: "ARCHIVED",
        category: "CIVIL",
        internalCode: "INT-001",
        title: "Test"
      });
      await expect(archiveMatter(validInput)).rejects.toThrow("案件已归档");
    });

    it("should reject if checklist missing required and not forced", async () => {
      mockPrisma.matter.findUnique.mockResolvedValue({
        id: "matter-1",
        status: "ACTIVE",
        category: "CIVIL",
        internalCode: "INT-001",
        title: "Test"
      });
      mockChecklistForCategory.mockReturnValue([
        { id: "1", label: "Required Item", required: true }
      ]);
      mockEvaluateChecklist.mockReturnValue({ missingRequired: [{ id: "1", label: "Required Item" }] });

      await expect(archiveMatter(validInput)).rejects.toThrow(/归档清单缺必填项/);
    });

    it("should succeed with forced missing", async () => {
      mockPrisma.matter.findUnique.mockResolvedValue({
        id: "matter-1",
        status: "ACTIVE",
        category: "CIVIL",
        internalCode: "INT-001",
        title: "Test"
      });
      mockChecklistForCategory.mockReturnValue([]);
      mockEvaluateChecklist.mockReturnValue({ missingRequired: [] });
      mockNextArchiveNo.mockResolvedValue("ARCH-2025-001");
      mockPrisma.archiveRecord.create.mockResolvedValue({ id: "ar-1" } as any);
      mockPrisma.matter.update.mockResolvedValue({ id: "matter-1" } as any);
      mockPrisma.timelineEvent.create.mockResolvedValue({} as any);
      mockRevalidatePath.mockImplementation(() => {});

      const result = await archiveMatter(validInput);
      expect(result).toEqual({
        ok: true,
        archiveNo: "ARCH-2025-001",
        status: "PENDING_REVIEW"
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "MATTER_ARCHIVE" })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/matters/matter-1");
    });

    it("should call assertMatterWritable and assertCanLeadMatter", async () => {
      mockPrisma.matter.findUnique.mockResolvedValue({
        id: "matter-1",
        status: "ACTIVE",
        category: "CIVIL",
        internalCode: "INT-001",
        title: "Test"
      });
      mockChecklistForCategory.mockReturnValue([]);
      mockEvaluateChecklist.mockReturnValue({ missingRequired: [] });
      mockNextArchiveNo.mockResolvedValue("ARCH-2025-002");
      mockPrisma.archiveRecord.create.mockResolvedValue({ id: "ar-1" } as any);
      mockPrisma.matter.update.mockResolvedValue({ id: "matter-1" } as any);
      mockPrisma.timelineEvent.create.mockResolvedValue({} as any);
      mockRevalidatePath.mockImplementation(() => {});

      await archiveMatter(validInput);
      expect(mockAssertMatterWritable).toHaveBeenCalledWith("matter-1");
      expect(mockAssertCanLeadMatter).toHaveBeenCalledWith(
        "user-1",
        "matter-1",
        "仅案件主办/协办可以提交归档申请"
      );
    });
  });

  describe("approveArchiveRecord", () => {
    it("should approve a pending archive", async () => {
      mockPrisma.archiveRecord.findUnique.mockResolvedValue({
        id: "ar-1",
        matterId: "matter-1",
        status: "PENDING_REVIEW",
        archiveNo: "ARCH-001"
      } as any);
      // Override session to ADMIN for approval
      mockRequireSession.mockResolvedValueOnce({ user: { id: "admin-1", name: "Admin", role: "ADMIN" } });
      mockPrisma.archiveRecord.update.mockResolvedValue({ id: "ar-1", status: "APPROVED" } as any);
      mockPrisma.matter.update.mockResolvedValue({ id: "matter-1" } as any);
      mockPrisma.timelineEvent.create.mockResolvedValue({} as any);
      mockRevalidatePath.mockImplementation(() => {});

      const result = await approveArchiveRecord({ archiveId: "ar-1" });
      expect(result).toEqual({ ok: true });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "ARCHIVE_APPROVE" })
      );
    });

    it("should reject if archive not pending", async () => {
      // Override session to ADMIN
      mockRequireSession.mockResolvedValueOnce({ user: { id: "admin-1", name: "Admin", role: "ADMIN" } });
      mockPrisma.archiveRecord.findUnique.mockResolvedValue({
        id: "ar-1",
        status: "APPROVED"
      } as any);
      await expect(approveArchiveRecord({ archiveId: "ar-1" })).rejects.toThrow(/此归档申请已审批/);
    });
  });

  describe("rejectArchiveRecord", () => {
    it("should reject an archive with reason", async () => {
      // Override session to ADMIN
      mockRequireSession.mockResolvedValueOnce({ user: { id: "admin-1", name: "Admin", role: "ADMIN" } });
      mockPrisma.archiveRecord.findUnique.mockResolvedValue({
        id: "ar-1",
        matterId: "matter-1",
        status: "PENDING_REVIEW"
      } as any);
      mockPrisma.archiveRecord.update.mockResolvedValue({ id: "ar-1", status: "REJECTED" } as any);
      mockPrisma.matter.update.mockResolvedValue({ id: "matter-1" } as any);
      mockPrisma.timelineEvent.create.mockResolvedValue({} as any);
      mockRevalidatePath.mockImplementation(() => {});

      const result = await rejectArchiveRecord({ archiveId: "ar-1", note: "Missing docs" });
      expect(result).toEqual({ ok: true });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ARCHIVE_REJECT",
          detail: expect.objectContaining({
            note: "Missing docs",
            matterId: "matter-1"
          })
        })
      );
    });
  });

  describe("batchApproveArchiveRecords", () => {
    it("should approve multiple pending archives", async () => {
      // Override session to ADMIN for all calls in this test
      mockRequireSession.mockResolvedValue({ user: { id: "admin-1", name: "Admin", role: "ADMIN" } });
      const ids = ["ar-1", "ar-2"];
      mockPrisma.archiveRecord.findMany.mockResolvedValue([
        { id: "ar-1", status: "PENDING_REVIEW", matterId: "m1" },
        { id: "ar-2", status: "PENDING_REVIEW", matterId: "m2" }
      ] as any);
      mockPrisma.archiveRecord.update.mockResolvedValue({} as any);
      mockPrisma.matter.update.mockResolvedValue({} as any);
      mockPrisma.timelineEvent.create.mockResolvedValue({} as any);
      mockRevalidatePath.mockImplementation(() => {});
      // Mock findUnique for approveArchiveRecord calls inside batch
      mockPrisma.archiveRecord.findUnique.mockResolvedValue({
        id: "ar-1",
        status: "PENDING_REVIEW",
        matterId: "m1",
        archiveNo: "ARCH-001",
        archivedById: "user-2"
      } as any);

      const result = await batchApproveArchiveRecords({ archiveIds: ids });
      expect(result).toEqual({ succeeded: ["ar-1", "ar-2"], failed: [] });
      expect(mockPrisma.archiveRecord.update).toHaveBeenCalledTimes(2);
    });
  });

  describe("batchRejectArchiveRecords", () => {
    it("should reject multiple pending archives", async () => {
      const ids = ["ar-1", "ar-2"];
      mockPrisma.archiveRecord.findMany.mockResolvedValue([
        { id: "ar-1", status: "PENDING_REVIEW", matterId: "m1" },
        { id: "ar-2", status: "PENDING_REVIEW", matterId: "m2" }
      ] as any);
      // Override session to ADMIN for all calls in this test
      mockRequireSession.mockResolvedValue({ user: { id: "admin-1", name: "Admin", role: "ADMIN" } });
      mockPrisma.archiveRecord.update.mockResolvedValue({} as any);
      mockPrisma.matter.update.mockResolvedValue({} as any);
      mockPrisma.timelineEvent.create.mockResolvedValue({} as any);
      mockRevalidatePath.mockImplementation(() => {});
      // Mock findUnique for rejectArchiveRecord calls inside batch
      mockPrisma.archiveRecord.findUnique.mockResolvedValue({
        id: "ar-1",
        status: "PENDING_REVIEW",
        matterId: "m1",
        archiveNo: "ARCH-001"
      } as any);

      const result = await batchRejectArchiveRecords({ archiveIds: ids, note: "Incomplete" });
      expect(result).toEqual({ succeeded: ["ar-1", "ar-2"], failed: [] });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "ARCHIVE_REJECT" })
      );
    });
  });
});
