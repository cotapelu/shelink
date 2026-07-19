// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  archiveMatter,
  approveArchiveRecord,
  rejectArchiveRecord,
  listPendingArchiveRecords
} from "@/server/archive/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { checklistForCategory, evaluateChecklist } from "@/lib/archive/checklists";
import { nextArchiveNo } from "@/lib/archive/archive-no";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanLeadMatter } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { renderArchiveCover, renderArchiveCatalog } from "@/server/archive/render";

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
  renderArchiveCover: vi.fn().mockResolvedValue("cover-id"),
  renderArchiveCatalog: vi.fn().mockResolvedValue("catalog-id")
}));
vi.mock("@/server/archive/schemas", () => ({
  archiveSubmitSchema: { parse: vi.fn((v) => v) },
  CLOSED_REASON_CN: { JUDGMENT: "判决", MEDIATION: "调解", WITHDRAWAL: "撤回", SETTLEMENT: "和解", RULING: "裁定", OTHER: "其他" }
}));

const mockPrisma = vi.mocked(prisma);
const mockRequireSession = vi.mocked(requireSession);
const mockChecklistForCategory = vi.mocked(checklistForCategory);
const mockEvaluateChecklist = vi.mocked(evaluateChecklist);
const mockNextArchiveNo = vi.mocked(nextArchiveNo);
const mockAssertMatterWritable = vi.mocked(assertMatterWritable);
const mockAssertCanLeadMatter = vi.mocked(assertCanLeadMatter);
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockRenderArchiveCover = vi.mocked(renderArchiveCover);
const mockRenderArchiveCatalog = vi.mocked(renderArchiveCatalog);

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
  mockChecklistForCategory.mockReturnValue([]);
  mockEvaluateChecklist.mockReturnValue({ missingRequired: [] });
  mockNextArchiveNo.mockResolvedValue("ARCH-2026-001");
  mockAssertMatterWritable.mockResolvedValue(undefined);
  mockAssertCanLeadMatter.mockResolvedValue(undefined);
  mockRevalidatePath.mockResolvedValue(undefined);
});

describe("archive/actions error paths", () => {
  it("archiveMatter: propagates assertMatterWritable error", async () => {
    mockAssertMatterWritable.mockRejectedValue(new Error("Matter locked"));
    const input = {
      matterId: "m1",
      summary: "s",
      checklist: {} as Record<string, boolean>,
      closedReason: "JUDGMENT" as const,
      completedAt: new Date(),
      judgmentSummary: "js",
      forceWithMissing: false
    };
    await expect(archiveMatter(input)).rejects.toThrow("Matter locked");
  });

  it("archiveMatter: propagates assertCanLeadMatter error", async () => {
    mockAssertCanLeadMatter.mockRejectedValue(new Error("Not a lead"));
    mockPrisma.matter.findUnique.mockResolvedValue({
      id: "m1",
      status: "DRAFT",
      category: "CIVIL" as const,
      internalCode: "INT-001",
      title: "T"
    });
    const input = {
      matterId: "m1",
      summary: "s",
      checklist: {} as Record<string, boolean>,
      closedReason: "JUDGMENT" as const,
      completedAt: new Date(),
      judgmentSummary: "js",
      forceWithMissing: false
    };
    await expect(archiveMatter(input)).rejects.toThrow("Not a lead");
  });

  it("archiveMatter: rejects when checklist missing required without force", async () => {
    mockPrisma.matter.findUnique.mockResolvedValue({
      id: "m1",
      status: "DRAFT",
      category: "CIVIL" as const,
      internalCode: "INT-001",
      title: "T"
    });
    mockEvaluateChecklist.mockReturnValue({
      missingRequired: [{ id: "i1", label: "Required" }]
    });
    const input = {
      matterId: "m1",
      summary: "s",
      checklist: {} as Record<string, boolean>,
      closedReason: "JUDGMENT" as const,
      completedAt: new Date(),
      judgmentSummary: "js",
      forceWithMissing: false
    };
    await expect(archiveMatter(input)).rejects.toThrow("必填项");
  });

  it("approveArchiveRecord: rejects non-ADMIN", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    await expect(approveArchiveRecord({ archiveId: "a1" })).rejects.toThrow("只有管理员");
  });

  it("approveArchiveRecord: rejects self-approval", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockPrisma.archiveRecord.findUnique.mockResolvedValue({
      id: "a1",
      matterId: "m1",
      status: "PENDING_REVIEW",
      archivedById: "admin1"
    });
    await expect(approveArchiveRecord({ archiveId: "a1" })).rejects.toThrow("你不能审批自己的申请");
  });

  it("approveArchiveRecord: rejects if not pending", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockPrisma.archiveRecord.findUnique.mockResolvedValue({
      id: "a1",
      matterId: "m1",
      status: "APPROVED",
      archivedById: "other"
    });
    await expect(approveArchiveRecord({ archiveId: "a1" })).rejects.toThrow("此归档申请已审批");
  });

  it("rejectArchiveRecord: rejects non-ADMIN", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    await expect(rejectArchiveRecord({ archiveId: "a1", note: "reason" })).rejects.toThrow("只有管理员");
  });

  it("rejectArchiveRecord: rejects empty note", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    await expect(rejectArchiveRecord({ archiveId: "a1", note: "   " })).rejects.toThrow("请填写驳回原因");
  });

  it("listPendingArchiveRecords: rejects non-ADMIN", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    await expect(listPendingArchiveRecords()).rejects.toThrow("仅管理员");
  });
});
