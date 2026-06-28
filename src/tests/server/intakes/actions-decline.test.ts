import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/auth/session");
vi.mock("@/server/audit");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: vi.fn() },
    intake: {
      update: vi.fn(),
      findUnique: vi.fn()
    }
  }
}));

vi.mock("@/server/intakes/schemas", () => ({
  declineIntakeSchema: { parse: vi.fn((x) => x) }
}));

vi.mock("@/server/notifications/approval", () => ({
  notifyRoleApprovers: vi.fn(),
  notifyDirectApprovers: vi.fn()
}));

// Import after mocks
import { declineIntake, markIntakeNeedsRevision, resubmitIntake } from "@/server/intakes/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";

describe("declineIntake", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("requires approver role", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    await expect(declineIntake({ id: "i1", reason: "x" })).rejects.toThrow("仅管理员或主任律师可审批收案");
  });

  it("declines intake and audits", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (prisma.intake.update as any).mockResolvedValue({});
    await declineIntake({ id: "i1", reason: "incomplete" });
    expect(prisma.intake.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { status: "DECLINED", declinedReason: "incomplete" }
    });
    expect(audit).toHaveBeenCalledWith({
      userId: "u1",
      action: "INTAKE_DECLINE",
      targetType: "Intake",
      targetId: "i1",
      detail: { reason: "incomplete" }
    });
    expect(revalidatePath).toHaveBeenCalledWith("/intakes");
    expect(revalidatePath).toHaveBeenCalledWith("/intakes/i1");
    expect(revalidatePath).toHaveBeenCalledWith("/matters");
  });
});

describe("markIntakeNeedsRevision", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("throws if reason empty", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    await expect(markIntakeNeedsRevision({ id: "i1", reason: "   " })).rejects.toThrow("请填写补正原因");
  });

  it("requires approver role", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    await expect(markIntakeNeedsRevision({ id: "i1", reason: "need" })).rejects.toThrow("仅管理员或主任律师可审批收案");
  });

  it("sets NEEDS_REVISION and audits", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "PRINCIPAL_LAWYER" } });
    (prisma.intake.update as any).mockResolvedValue({});
    await markIntakeNeedsRevision({ id: "i1", reason: "missing docs" });
    expect(prisma.intake.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { status: "NEEDS_REVISION", declinedReason: "missing docs" }
    });
    expect(audit).toHaveBeenCalledWith({
      userId: "u1",
      action: "INTAKE_NEEDS_REVISION",
      targetType: "Intake",
      targetId: "i1",
      detail: { reason: "missing docs" }
    });
    expect(revalidatePath).toHaveBeenCalledWith("/intakes");
    expect(revalidatePath).toHaveBeenCalledWith("/intakes/i1");
    expect(revalidatePath).toHaveBeenCalledWith("/matters");
  });
});

describe("resubmitIntake", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it("throws if intake not found", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    (prisma.intake.findUnique as any).mockResolvedValue(null);
    await expect(resubmitIntake("i1")).rejects.toThrow("收案不存在");
  });

  it("throws if status not NEEDS_REVISION", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    (prisma.intake.findUnique as any).mockResolvedValue({ status: "PENDING", title: "T", createdById: "u1", ownerUserId: "u1" });
    await expect(resubmitIntake("i1")).rejects.toThrow("只有待补正状态可重新提交");
  });

  it("resets status and notifies", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
    (prisma.intake.findUnique as any).mockResolvedValue({
      status: "NEEDS_REVISION",
      title: "My Case",
      createdById: "u1",
      ownerUserId: "u1"
    });
    (prisma.intake.update as any).mockResolvedValue({});
    await resubmitIntake("i1");
    expect(prisma.intake.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { status: "PENDING_CONFIRMATION", declinedReason: null }
    });
    expect(audit).toHaveBeenCalledWith({
      userId: "u1",
      action: "INTAKE_RESUBMIT",
      targetType: "Intake",
      targetId: "i1",
      detail: {}
    });
    expect(revalidatePath).toHaveBeenCalledWith("/intakes");
    expect(revalidatePath).toHaveBeenCalledWith("/intakes/i1");
    expect(revalidatePath).toHaveBeenCalledWith("/matters");
  });
});
