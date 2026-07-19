// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  archiveMatter,
  approveArchiveRecord,
  rejectArchiveRecord,
  batchApproveArchiveRecords,
  batchRejectArchiveRecords,
  getArchivePrepData,
  listArchivedMatters,
  listPendingArchiveRecords,
  listRejectedArchiveRecords,
  getLatestArchiveRecord,
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
    archiveRecord: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
    timelineEvent: { create: vi.fn(), findFirst: vi.fn() },
    document: { update: vi.fn(), findMany: vi.fn() }
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

    // Additional error path and validation tests for batchApproveArchiveRecords
    it("rejects non-ADMIN role", async () => {
      mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
      await expect(batchApproveArchiveRecords({ archiveIds: ["ar-1"] })).rejects.toThrow("只有管理员可以审批归档申请");
    });

    it("rejects empty archiveIds", async () => {
      mockRequireSession.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
      await expect(batchApproveArchiveRecords({ archiveIds: [] })).rejects.toThrow("未选择任何归档申请");
    });

    it("rejects archiveIds > 100", async () => {
      mockRequireSession.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
      const many = Array.from({ length: 101 }, (_, i) => `ar-${i}`);
      await expect(batchApproveArchiveRecords({ archiveIds: many })).rejects.toThrow("单次批量不超过 100 条");
    });

    it("handles partial failures during batch approve", async () => {
      mockRequireSession.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
      const ids = ["ar-1", "ar-2"];
      mockPrisma.archiveRecord.findMany.mockResolvedValue([
        { id: "ar-1", status: "PENDING_REVIEW", matterId: "m1" },
        { id: "ar-2", status: "PENDING_REVIEW", matterId: "m2" }
      ] as any);
      // First update fails, second succeeds
      mockPrisma.archiveRecord.update
        .mockRejectedValueOnce(new Error("DB error"))
        .mockResolvedValueOnce({} as any);
      mockPrisma.matter.update.mockResolvedValueOnce({} as any);
      mockPrisma.timelineEvent.create.mockResolvedValueOnce({} as any);
      mockRevalidatePath.mockImplementation(() => {});
      mockPrisma.archiveRecord.findUnique
        .mockResolvedValueOnce({
          id: "ar-1",
          status: "PENDING_REVIEW",
          matterId: "m1",
          archiveNo: "ARCH-001",
          archivedById: "user-2"
        } as any)
        .mockResolvedValueOnce({
          id: "ar-2",
          status: "PENDING_REVIEW",
          matterId: "m2",
          archiveNo: "ARCH-002",
          archivedById: "user-2"
        } as any);

      const result = await batchApproveArchiveRecords({ archiveIds: ids });
      expect(result).toEqual({
        succeeded: ["ar-2"],
        failed: [{ id: "ar-1", error: "DB error" }]
      });
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

describe("getArchivePrepData", () => {
  it("should return archive prep data", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    mockAssertCanLeadMatter.mockResolvedValue(undefined);
    mockPrisma.matter.findUnique.mockResolvedValue({
      id: "m1",
      title: "Matter",
      category: "CIVIL",
      internalCode: "INT-001",
      archiveRecords: []
    } as any);
    mockChecklistForCategory.mockReturnValue([]);
    mockPrisma.timelineEvent.findFirst.mockResolvedValue({ content: "Summary" } as any);
    mockPrisma.document.findMany.mockResolvedValue([] as any);

    const result = await getArchivePrepData("m1");
    expect(result).toHaveProperty("matter");
    expect(result.checklist).toEqual([]);
    expect(result.existingSummary).toBe("Summary");
    expect(result.docsByItem).toEqual({});
  });

  it("should populate docsByItem from linked documents", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    mockAssertCanLeadMatter.mockResolvedValue(undefined);
    mockPrisma.matter.findUnique.mockResolvedValue({
      id: "m1",
      title: "Matter",
      category: "CIVIL",
      internalCode: "INT-001",
      archiveRecords: []
    } as any);
    mockChecklistForCategory.mockReturnValue([]);
    mockPrisma.timelineEvent.findFirst.mockResolvedValue(null as any);
    mockPrisma.document.findMany.mockResolvedValue([
      { id: "d1", name: "Doc1", archiveChecklistItemId: "item1", createdAt: new Date("2025-01-01") },
      { id: "d2", name: "Doc2", archiveChecklistItemId: "item1", createdAt: new Date("2025-01-02") },
      { id: "d3", name: "Doc3", archiveChecklistItemId: "item2", createdAt: new Date("2025-01-03") }
    ] as any);

    const result = await getArchivePrepData("m1");
    expect(result.docsByItem).toEqual({
      item1: [
        { id: "d1", name: "Doc1" },
        { id: "d2", name: "Doc2" }
      ],
      item2: [
        { id: "d3", name: "Doc3" }
      ]
    });
  });

  it("should return null existingSummary when no close event", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    mockAssertCanLeadMatter.mockResolvedValue(undefined);
    mockPrisma.matter.findUnique.mockResolvedValue({
      id: "m1",
      title: "Matter",
      category: "CIVIL",
      internalCode: "INT-001",
      archiveRecords: []
    } as any);
    mockChecklistForCategory.mockReturnValue([]);
    mockPrisma.timelineEvent.findFirst.mockResolvedValue(null as any);
    mockPrisma.document.findMany.mockResolvedValue([] as any);

    const result = await getArchivePrepData("m1");
    expect(result.existingSummary).toBeNull();
  });
});

describe("listArchivedMatters", () => {
  it("should list approved archive records", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    mockPrisma.archiveRecord.findMany.mockResolvedValue([
      {
        id: "ar1",
        status: "APPROVED",
        archivedAt: new Date(),
        archiveNo: "A001",
        summary: "Sum",
        closedReason: "JUDGMENT",
        completedAt: new Date(),
        archivedBy: { id: "u2", name: "Admin" },
        missingItems: [],
        matter: {
          id: "m1",
          title: "M1",
          firmCaseNo: "FCN1",
          category: "CIVIL",
          primaryClient: { name: "Client" }
        }
      }
    ] as any);

    const result = await listArchivedMatters();
    expect(result).toHaveLength(1);
    expect(result[0].archiveNo).toBe("A001");
  });
});

describe("listPendingArchiveRecords", () => {
  it("should list pending archive records", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    mockPrisma.archiveRecord.findMany.mockResolvedValue([
      { id: "ar-p1", status: "PENDING_REVIEW", matterId: "m1" }
    ] as any);

    const result = await listPendingArchiveRecords();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("PENDING_REVIEW");
  });
});

describe("listRejectedArchiveRecords", () => {
  it("should list rejected archive records", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    mockPrisma.archiveRecord.findMany.mockResolvedValue([
      { id: "ar-r1", status: "REJECTED", matterId: "m1" }
    ] as any);

    const result = await listRejectedArchiveRecords();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("REJECTED");
  });

  it("returns empty array when no rejected records", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    mockPrisma.archiveRecord.findMany.mockResolvedValue([] as any);

    const result = await listRejectedArchiveRecords();
    expect(result).toEqual([]);
  });

  it("filters by archivedById in where clause", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    mockPrisma.archiveRecord.findMany.mockResolvedValue([
      { id: "ar-r1", status: "REJECTED", matterId: "m1", archivedById: "u1" }
    ] as any);

    const result = await listRejectedArchiveRecords();
    expect(mockPrisma.archiveRecord.findMany).toHaveBeenCalledWith({
      where: { archivedById: "u1", status: "REJECTED" },
      orderBy: { archivedAt: "desc" },
      take: 100,
      select: expect.any(Object)
    });
    expect(result).toHaveLength(1);
  });
});

describe("getLatestArchiveRecord", () => {
  it("should get latest archive record for matter", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    mockAssertCanLeadMatter.mockResolvedValue(undefined);
    mockPrisma.archiveRecord.findFirst.mockResolvedValue({
      id: "ar-latest",
      status: "APPROVED",
      archiveNo: "ARCH-2025-001",
      summary: "Latest summary"
    } as any);

    const result = await getLatestArchiveRecord("m1");
    expect(result).toHaveProperty("archiveNo", "ARCH-2025-001");
  });

  it("returns null when no archive record exists", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    mockAssertCanLeadMatter.mockResolvedValue(undefined);
    mockPrisma.archiveRecord.findFirst.mockResolvedValue(null as any);

    const result = await getLatestArchiveRecord("m1");
    expect(result).toBeNull();
  });

  it("returns latest record ordered by archivedAt desc when multiple exist", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    mockAssertCanLeadMatter.mockResolvedValue(undefined);
    mockPrisma.archiveRecord.findFirst.mockResolvedValue({
      id: "ar-newest",
      status: "PENDING_REVIEW",
      archivedAt: new Date("2025-03-01"),
      archiveNo: "ARCH-003"
    } as any);

    const result = await getLatestArchiveRecord("m1");
    expect(result?.archiveNo).toBe("ARCH-003");
  });
});

