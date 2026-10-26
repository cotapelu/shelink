// @ts-nocheck
/**
 * Bổ sung phủ nhánh cho server/archive/actions.ts (điểm nghẽt branch ~74%).
 * Không sửa code production — chỉ thêm test cho các nhánh còn hở.
 * Tái dùng bộ mock từ actions-error.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  archiveMatter,
  approveArchiveRecord,
  rejectArchiveRecord
} from "@/server/archive/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { evaluateChecklist } from "@/lib/archive/checklists";
import { nextArchiveNo } from "@/lib/archive/archive-no";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanLeadMatter } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { renderArchiveCover, renderArchiveCatalog } from "@/server/archive/render";
import { createNotification } from "@/server/notifications/create";

vi.mock("@/lib/prisma", () => {
  const db: any = {
    matter: { findUnique: vi.fn(), update: vi.fn() },
    archiveRecord: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
    timelineEvent: { create: vi.fn(), findFirst: vi.fn() },
    document: { update: vi.fn(), findMany: vi.fn() }
  };
  db.$transaction = vi.fn();
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
  renderArchiveCover: vi.fn(),
  renderArchiveCatalog: vi.fn()
}));
vi.mock("@/server/archive/schemas", () => ({
  archiveSubmitSchema: { parse: vi.fn((v) => v) },
  CLOSED_REASON_CN: { JUDGMENT: "Bản án", MEDIATION: "Hòa giải", WITHDRAWAL: "Rút đơn kiện", SETTLEMENT: "Thỏa thuận dừng kiện", RULING: "Quyết định", OTHER: "Khác" }
}));

const mockPrisma = vi.mocked(prisma);
const mockRequireSession = vi.mocked(requireSession);
const mockEvaluateChecklist = vi.mocked(evaluateChecklist);
const mockNextArchiveNo = vi.mocked(nextArchiveNo);
const mockAssertMatterWritable = vi.mocked(assertMatterWritable);
const mockAssertCanLeadMatter = vi.mocked(assertCanLeadMatter);
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockRenderArchiveCover = vi.mocked(renderArchiveCover);
const mockRenderArchiveCatalog = vi.mocked(renderArchiveCatalog);
const mockCreateNotification = vi.mocked(createNotification);

const MATTER = {
  id: "m1",
  status: "CLOSED",
  category: "CIVIL_COMMERCIAL" as const,
  internalCode: "INT-001",
  title: "T"
};

function archiveInput(over: Record<string, unknown> = {}) {
  return {
    matterId: "m1",
    summary: "s",
    checklist: {} as Record<string, boolean>,
    closedReason: "JUDGMENT" as const,
    completedAt: new Date("2026-01-01"),
    forceWithMissing: false,
    ...over
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER", name: "LS A" } });
  mockEvaluateChecklist.mockReturnValue({ missingRequired: [] });
  mockNextArchiveNo.mockResolvedValue("ARCH-2026-001");
  mockAssertMatterWritable.mockResolvedValue(undefined);
  mockAssertCanLeadMatter.mockResolvedValue(undefined);
  mockRevalidatePath.mockResolvedValue(undefined);
  mockRenderArchiveCover.mockResolvedValue("cover-id");
  mockRenderArchiveCatalog.mockResolvedValue("catalog-id");
  mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
  mockPrisma.archiveRecord.create.mockResolvedValue({ id: "rec1" });
  mockPrisma.timelineEvent.create.mockResolvedValue({ id: "tl1" });
  mockPrisma.archiveRecord.update.mockResolvedValue({ id: "rec1" });
  mockPrisma.matter.update.mockResolvedValue({ id: "m1" });
});

describe("archiveMatter branches", () => {
  it("succeeds and forces archive when checklist missing but forceWithMissing=true", async () => {
    mockPrisma.matter.findUnique.mockResolvedValue(MATTER);
    mockEvaluateChecklist.mockReturnValue({ missingRequired: [{ id: "i1", label: "X" }] });

    const res = await archiveMatter(archiveInput({ forceWithMissing: true }));

    expect(res).toEqual({ ok: true, archiveNo: "ARCH-2026-001", status: "PENDING_REVIEW" });
    const createArg = mockPrisma.archiveRecord.create.mock.calls[0][0];
    expect(createArg.data.missingItems).toEqual(["i1"]);
    // judgmentSummary absent → judgmentSummary || null branch
    expect(createArg.data.judgmentSummary).toBeNull();
    // session.user.name present → archivedBy name ?? id branch
    expect(createArg.data.archivedBy).toBe("LS A");
  });

  it("falls back archivedBy to user id when name missing", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "u9", role: "LAWYER" } });
    mockPrisma.matter.findUnique.mockResolvedValue(MATTER);
    await archiveMatter(archiveInput());
    expect(mockPrisma.archiveRecord.create.mock.calls[0][0].data.archivedBy).toBe("u9");
  });

  it("rejects when matter missing (Vụ án không tồn tại)", async () => {
    mockPrisma.matter.findUnique.mockResolvedValue(null);
    await expect(archiveMatter(archiveInput())).rejects.toThrow("Vụ án không tồn tại");
  });

  it("rejects when matter already archived (Vụ án đã được lưu trữ)", async () => {
    mockPrisma.matter.findUnique.mockResolvedValue({ ...MATTER, status: "ARCHIVED" });
    await expect(archiveMatter(archiveInput())).rejects.toThrow("Vụ án đã được lưu trữ");
  });

  it("cleans up cover doc and rethrows when catalog render fails (Error)", async () => {
    mockPrisma.matter.findUnique.mockResolvedValue(MATTER);
    mockRenderArchiveCatalog.mockRejectedValue(new Error("boom"));
    mockPrisma.document.update.mockResolvedValue({ id: "cover-id" });

    await expect(archiveMatter(archiveInput())).rejects.toThrow("Render mục lục hồ sơ thất bại: boom");
    expect(mockPrisma.document.update).toHaveBeenCalledWith({
      where: { id: "cover-id" },
      data: { deletedAt: expect.any(Date) }
    });
  });

  it("covers non-Error rejection in catalog render (String(err))", async () => {
    mockPrisma.matter.findUnique.mockResolvedValue(MATTER);
    mockRenderArchiveCatalog.mockRejectedValue("plain");
    mockPrisma.document.update.mockResolvedValue({ id: "cover-id" });
    await expect(archiveMatter(archiveInput())).rejects.toThrow("Render mục lục hồ sơ thất bại: plain");
  });
});

function seedApprovable(over: Record<string, unknown> = {}) {
  mockRequireSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
  mockPrisma.archiveRecord.findUnique.mockResolvedValue({
    id: "a1",
    matterId: "m1",
    status: "PENDING_REVIEW",
    completedAt: new Date("2026-01-02"),
    archiveNo: "ARCH-2026-001",
    archivedById: "app1",
    ...over
  });
}

describe("approveArchiveRecord branches", () => {
  it("approves another applicant's record and notifies (matter found, with note)", async () => {
    seedApprovable();
    mockPrisma.matter.findUnique.mockResolvedValue({ title: "T", internalCode: "INT-001" });
    const res = await approveArchiveRecord({ archiveId: "a1", note: " ok " });
    expect(res).toEqual({ ok: true });
    // note branch in timeline content + reviewNote trimmed
    const tl = mockPrisma.timelineEvent.create.mock.calls[0][0];
    expect(tl.data.content).toBe("Quản trị duyệt: ok");
    const upd = mockPrisma.archiveRecord.update.mock.calls[0][0];
    expect(upd.data.reviewNote).toBe("ok");
    expect(mockCreateNotification).toHaveBeenCalledOnce();
    expect(mockCreateNotification.mock.calls[0][0].content).toContain("INT-001");
  });

  it("handles completedAt=null (closedAt ?? archivedAt) and no-note timeline + matter null", async () => {
    seedApprovable({ completedAt: null });
    mockPrisma.matter.findUnique.mockResolvedValue(null);
    await approveArchiveRecord({ archiveId: "a1" });
    const upd = mockPrisma.archiveRecord.update.mock.calls[0][0];
    expect(upd.data.reviewNote).toBeNull();
    const tl = mockPrisma.timelineEvent.create.mock.calls[0][0];
    expect(tl.data.content).toBe("Quản trị duyệt qua");
    const matterUpd = mockPrisma.matter.update.mock.calls[0][0];
    expect(matterUpd.data.closedAt).toBe(matterUpd.data.archivedAt); // closedAt ?? archivedAt
    // notifyApplicant runs with matter null → falls back to record.matterId
    expect(mockCreateNotification.mock.calls[0][0].content).toContain("m1");
  });

  it("rejects if record not found (Bản ghi lưu trữ không tồn tại)", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockPrisma.archiveRecord.findUnique.mockResolvedValue(null);
    await expect(approveArchiveRecord({ archiveId: "a1" })).rejects.toThrow("Bản ghi lưu trữ không tồn tại");
  });
});

describe("rejectArchiveRecord branches", () => {
  function seedRejectable(over: Record<string, unknown> = {}) {
    mockRequireSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockPrisma.archiveRecord.findUnique.mockResolvedValue({
      id: "a1",
      matterId: "m1",
      status: "PENDING_REVIEW",
      archiveNo: "ARCH-2026-001",
      archivedById: "app1",
      ...over
    });
    mockPrisma.archiveRecord.update.mockResolvedValue({ id: "a1" });
  }

  it("rejects another applicant's record and notifies with matter null", async () => {
    seedRejectable();
    mockPrisma.matter.findUnique.mockResolvedValue(null);
    const res = await rejectArchiveRecord({ archiveId: "a1", note: "thiếu" });
    expect(res).toEqual({ ok: true });
    expect(mockCreateNotification).toHaveBeenCalledOnce();
    expect(mockCreateNotification.mock.calls[0][0].content).toContain("m1");
  });

  it("skips notification when rejecting own request", async () => {
    seedRejectable({ archivedById: "admin1" });
    mockPrisma.matter.findUnique.mockResolvedValue(null);
    await rejectArchiveRecord({ archiveId: "a1", note: "thiếu" });
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it("rejects if record not found / not pending", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockPrisma.archiveRecord.findUnique.mockResolvedValue(null);
    await expect(rejectArchiveRecord({ archiveId: "a1", note: "x" })).rejects.toThrow("Bản ghi lưu trữ không tồn tại");
    mockPrisma.archiveRecord.findUnique.mockResolvedValue({ id: "a1", status: "APPROVED", archivedById: "app1", archiveNo: "A", matterId: "m1" });
    await expect(rejectArchiveRecord({ archiveId: "a1", note: "x" })).rejects.toThrow("Yêu cầu lưu trữ này đã được duyệt");
  });
});
