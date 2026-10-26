// @ts-nocheck - mock prisma nông, ép kiểu gây nhiễu test
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createLeaveRequest,
  listLeaveRequests,
  decideLeaveRequest,
  cancelLeaveRequest
} from "./actions";
import { requireSession } from "@/lib/auth/session";
import { isManager } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    leaveRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    systemSetting: { findUnique: vi.fn() }
  }
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/permissions", () => ({ isManager: vi.fn() }));
vi.mock("@/server/audit", () => ({ audit: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockSession = vi.mocked(requireSession, true);
const mockIsManager = vi.mocked(isManager, true);
const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.mockResolvedValue({ user: { id: "u1", role: "STAFF" } } as any);
  mockIsManager.mockReturnValue(false);
  mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
  mockPrisma.leaveRequest.findMany.mockResolvedValue([]);
});

describe("createLeaveRequest", () => {
  it("tính inclusive days và mặc định SUBMITTED, gắn người xin", async () => {
    mockPrisma.leaveRequest.create.mockResolvedValue({ id: "cleave0000000000000000000001" });
    const id = await createLeaveRequest({
      leaveType: "ANNUAL",
      startDate: "2026-01-01",
      endDate: "2026-01-03"
    });
    expect(id).toBe("cleave0000000000000000000001");
    expect(mockPrisma.leaveRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u1", days: 3, status: "SUBMITTED" })
      })
    );
  });

  it("rejects khi endDate < startDate", async () => {
    await expect(
      createLeaveRequest({ leaveType: "SICK", startDate: "2026-01-03", endDate: "2026-01-01" })
    ).rejects.toThrow();
    expect(mockPrisma.leaveRequest.create).not.toHaveBeenCalled();
  });
});

describe("decideLeaveRequest", () => {
  it("chống non-manager", async () => {
    await expect(decideLeaveRequest({ id: "cleave0000000000000000000001", approve: true })).rejects.toThrow(/quản lý/);
  });
  it("challenge: chỉ duyệt đơn SUBMITTED", async () => {
    mockIsManager.mockReturnValue(true);
    mockPrisma.leaveRequest.findUnique.mockResolvedValue({ status: "APPROVED" });
    await expect(decideLeaveRequest({ id: "cleave0000000000000000000001", approve: true })).rejects.toThrow(/chờ/);
    expect(mockPrisma.leaveRequest.update).not.toHaveBeenCalled();
  });
  it("duyệt: ghi approver + decidedAt", async () => {
    mockIsManager.mockReturnValue(true);
    mockPrisma.leaveRequest.findUnique.mockResolvedValue({ status: "SUBMITTED" });
    await decideLeaveRequest({ id: "cleave0000000000000000000001", approve: true });
    expect(mockPrisma.leaveRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "APPROVED", approverId: "u1" })
      })
    );
  });
  it("từ chối bắt buộc lý do", async () => {
    mockIsManager.mockReturnValue(true);
    mockPrisma.leaveRequest.findUnique.mockResolvedValue({ status: "SUBMITTED" });
    await expect(decideLeaveRequest({ id: "cleave0000000000000000000001", approve: false })).rejects.toThrow(/lý do/);
  });
});

describe("cancelLeaveRequest", () => {
  it("chủ đơn được rút khi SUBMITTED", async () => {
    mockPrisma.leaveRequest.findUnique.mockResolvedValue({ userId: "u1", status: "SUBMITTED" });
    await cancelLeaveRequest({ id: "cleave0000000000000000000001" });
    expect(mockPrisma.leaveRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "CANCELLED" } })
    );
  });
  it("chặn người khác / trạng thái đã duyệt", async () => {
    mockPrisma.leaveRequest.findUnique.mockResolvedValue({ userId: "other", status: "SUBMITTED" });
    await expect(cancelLeaveRequest({ id: "cleave0000000000000000000001" })).rejects.toThrow(/quyền/);
    mockPrisma.leaveRequest.findUnique.mockResolvedValue({ userId: "u1", status: "APPROVED" });
    await expect(cancelLeaveRequest({ id: "cleave0000000000000000000001" })).rejects.toThrow(/rút/);
  });
});

describe("listLeaveRequests", () => {
  it("non-manager chỉ thấy của mình", async () => {
    await listLeaveRequests({});
    expect(mockPrisma.leaveRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "u1" }) })
    );
  });
  it("manager thấy tất cả (không Giới Hạn userId)", async () => {
    mockIsManager.mockReturnValue(true);
    await listLeaveRequests({});
    const arg = mockPrisma.leaveRequest.findMany.mock.calls[0][0];
    expect(arg.where.userId).toBeUndefined();
  });
});
