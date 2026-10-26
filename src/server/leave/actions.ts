"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { isManager } from "@/lib/permissions";
import { audit } from "@/server/audit";
import {
  leaveCreateSchema,
  leaveIdSchema,
  leaveDecisionSchema,
  leaveListFilterSchema,
  type LeaveListFilter
} from "./schemas";
import {
  buildLeaveBalance,
  computeLeaveDays,
  parseLeaveSettings,
  type LeaveBalance,
  type LeaveBalanceRow
} from "./balance";

type Session = { user: { id: string; role: string } };
type SessionUser = Awaited<ReturnType<typeof requireSession>>;

type LeaveRowWithUser = Prisma.LeaveRequestGetPayload<{
  include: { user: { select: { id: true, name: true } } };
}>;

function revalidateLeavePaths(): void {
  revalidatePath("/leave");
}

async function recordLeaveAudit(
  userId: string,
  action: string,
  targetId: string,
  detail?: Record<string, unknown>
): Promise<void> {
  await audit({ userId, action, targetType: "LeaveRequest", targetId, detail });
}

/** Xây phạm vi hiển thị: non-manager chỉ thấy của mình; manager thấy tất cả (trừ scope=mine). */
function buildListWhere(session: Session, filter: { scope?: LeaveListFilter["scope"] }): Prisma.LeaveRequestWhereInput {
  const where: Prisma.LeaveRequestWhereInput = { deletedAt: null };
  if (!isManager(session.user.role) || filter.scope === "mine") {
    where.userId = session.user.id;
  }
  return where;
}

/** Lọc theo trạng thái/loại/năm (tách khỏi phạm vi hiển thị). */
function leaveFilters(filter: LeaveListFilter): Prisma.LeaveRequestWhereInput {
  return {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.leaveType ? { leaveType: filter.leaveType } : {}),
    ...(filter.year
      ? {
          startDate: {
            gte: new Date(Date.UTC(filter.year, 0, 1)),
            lt: new Date(Date.UTC(filter.year + 1, 0, 1))
          }
        }
      : {})
  };
}

function mapLeaveRow(r: LeaveRowWithUser) {
  return {
    id: r.id,
    leaveType: r.leaveType,
    startDate: r.startDate,
    endDate: r.endDate,
    days: Number(r.days),
    reason: r.reason,
    status: r.status,
    approverId: r.approverId,
    decisionNote: r.decisionNote,
    decidedAt: r.decidedAt,
    user: r.user
  };
}

async function balanceForUser(userId: string): Promise<LeaveBalance> {
  const row = await prisma.systemSetting.findUnique({ where: { key: "leave" } });
  const settings = parseLeaveSettings(row?.value);
  const year = new Date().getFullYear();
  const rows = await prisma.leaveRequest.findMany({
    where: { userId, deletedAt: null },
    select: { startDate: true, days: true, status: true }
  });
  const balanceRows: LeaveBalanceRow[] = rows.map((r) => ({
    startDate: r.startDate,
    days: Number(r.days),
    status: r.status
  }));
  return buildLeaveBalance(balanceRows, settings, year);
}

async function assertPendingLeave(id: string): Promise<void> {
  const current = await prisma.leaveRequest.findUnique({
    where: { id },
    select: { status: true }
  });
  if (!current) throw new Error("Đơn nghỉ phép không tồn tại");
  if (current.status !== "SUBMITTED") throw new Error("Chỉ duyệt được đơn đang chờ");
}

export async function createLeaveRequest(input: unknown) {
  const session = await requireSession();
  const data = leaveCreateSchema.parse(input);
  const days = computeLeaveDays(data.startDate, data.endDate);
  const created = await prisma.leaveRequest.create({
    data: {
      userId: session.user.id,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      days,
      reason: data.reason,
      status: data.status
    },
    select: { id: true }
  });
  await recordLeaveAudit(session.user.id, "CREATE", created.id, { days, leaveType: data.leaveType, status: data.status });
  revalidateLeavePaths();
  return created.id;
}

export async function listLeaveRequests(input?: unknown) {
  const session = await requireSession();
  const filter = leaveListFilterSchema.parse(input ?? {});
  const rows = await prisma.leaveRequest.findMany({
    where: { ...buildListWhere(session, filter), ...leaveFilters(filter) },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { id: true, name: true } } }
  });
  return { items: rows.map(mapLeaveRow), balance: await balanceForUser(session.user.id) };
}

export async function decideLeaveRequest(input: unknown) {
  const session = await requireSession();
  if (!isManager(session.user.role)) throw new Error("Chỉ quản lý (ADMIN/OWNER/MANAGER) được duyệt");
  const data = leaveDecisionSchema.parse(input);
  await assertPendingLeave(data.id);
  await prisma.leaveRequest.update({
    where: { id: data.id },
    data: {
      status: data.approve ? "APPROVED" : "REJECTED",
      approverId: session.user.id,
      decidedAt: new Date(),
      decisionNote: data.note
    }
  });
  await recordLeaveAudit(session.user.id, data.approve ? "APPROVE" : "REJECT", data.id);
  revalidateLeavePaths();
  return { ok: true };
}

export async function cancelLeaveRequest(input: unknown) {
  const session: SessionUser = await requireSession();
  const { id } = leaveIdSchema.parse(input);
  const current = await prisma.leaveRequest.findUnique({
    where: { id },
    select: { userId: true, status: true }
  });
  if (!current) throw new Error("Đơn nghỉ phép không tồn tại");
  const canCancel = current.userId === session.user.id || isManager(session.user.role);
  if (!canCancel) throw new Error("Không có quyền rút đơn này");
  if (current.status !== "SUBMITTED" && current.status !== "DRAFT") {
    throw new Error("Chỉ rút được đơn còn ở trạng thái gửi/nháp");
  }
  await prisma.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });
  await recordLeaveAudit(session.user.id, "CANCEL", id);
  revalidateLeavePaths();
  return { ok: true };
}
