// @ts-nocheck
/**
 * Test moveIntakeStage (TD-A1/A2): phân quyền, chỉ giai đoạn đang xử lý,
 * notify approver khi về PENDING_CONFIRMATION, no-op khi cùng trạng thái.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { moveIntakeStage } from "./actions";
import { prisma } from "@/lib/prisma";
import { notifyRoleApprovers } from "@/server/notifications/approval";
import { getServerSession } from "next-auth";

const ID = "c" + "0".repeat(24);

vi.mock("@/lib/prisma", () => ({
  prisma: { intake: { findUnique: vi.fn(), update: vi.fn() } }
}));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/audit", () => ({ audit: vi.fn() }));
vi.mock("@/server/notifications/approval", () => ({ notifyRoleApprovers: vi.fn() }));

const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN", name: "Admin" } });
  mockPrisma.intake.update.mockResolvedValue({});
});

function seedIntake(over: Record<string, unknown>) {
  mockPrisma.intake.findUnique.mockResolvedValue({
    status: "INTAKE",
    title: "Khách gọi tư vấn",
    createdById: "u2",
    ownerUserId: "u1",
    coUserIds: [],
    ...over
  });
}

describe("moveIntakeStage", () => {
  it("moves INTAKE → PENDING_CONFIRMATION and notifies approvers", async () => {
    seedIntake({});
    const res = await moveIntakeStage({ id: ID, toStatus: "PENDING_CONFIRMATION" });
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.intake.update.mock.calls[0][0].data).toEqual({ status: "PENDING_CONFIRMATION" });
    expect(notifyRoleApprovers).toHaveBeenCalledOnce();
  });

  it("moves PENDING_CONFIRMATION → INTAKE (recall) without notifying", async () => {
    seedIntake({ status: "PENDING_CONFIRMATION" });
    await moveIntakeStage({ id: ID, toStatus: "INTAKE" });
    expect(mockPrisma.intake.update.mock.calls[0][0].data).toEqual({ status: "INTAKE" });
    expect(notifyRoleApprovers).not.toHaveBeenCalled();
  });

  it("is a no-op when target equals current status", async () => {
    seedIntake({ status: "PENDING_CONFIRMATION" });
    const res = await moveIntakeStage({ id: ID, toStatus: "PENDING_CONFIRMATION" });
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.intake.update).not.toHaveBeenCalled();
  });

  it("allows owner (non-manager) to move", async () => {
    getServerSession.mockResolvedValue({ user: { id: "u9", role: "LAWYER", name: "Luat su" } });
    seedIntake({ ownerUserId: "u9" });
    await moveIntakeStage({ id: ID, toStatus: "PENDING_CONFIRMATION" });
    expect(mockPrisma.intake.update).toHaveBeenCalledOnce();
  });

  it("rejects unrelated non-manager", async () => {
    getServerSession.mockResolvedValue({ user: { id: "uX", role: "LAWYER" } });
    seedIntake({ ownerUserId: "u1", createdById: "u2" });
    await expect(moveIntakeStage({ id: ID, toStatus: "PENDING_CONFIRMATION" })).rejects.toThrow(/đổi giai đoạn/i);
  });

  it("rejects moving an intake that is not in a working stage", async () => {
    seedIntake({ status: "NEEDS_REVISION" });
    await expect(moveIntakeStage({ id: ID, toStatus: "PENDING_CONFIRMATION" })).rejects.toThrow(/đang xử lý/i);
  });

  it("rejects a terminal target status via schema", async () => {
    seedIntake({});
    await expect(moveIntakeStage({ id: ID, toStatus: "DECLINED" })).rejects.toThrow();
  });

  it("rejects missing intake", async () => {
    mockPrisma.intake.findUnique.mockResolvedValue(null);
    await expect(moveIntakeStage({ id: ID, toStatus: "PENDING_CONFIRMATION" })).rejects.toThrow(/không tồn tại/i);
  });
});
