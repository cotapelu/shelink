/**
 * Số dư phép — thuần, không DB/React (DATA-MODEL §4.33).
 * Số dư KHÔNG lưu: usedDays tính tại chỗ từ các đơn APPROVED/đang SUBMITTED.
 */

import type { LeaveStatus } from "@prisma/client";

const MS_PER_DAY = 86_400_000;

/** Các trạng thái "đang chiếm" số ngày phép. */
export const ACTIVE_LEAVE_STATUSES: LeaveStatus[] = ["SUBMITTED", "APPROVED"];

export type LeaveSettings = {
  annualEntitlementDays: number;
  carryOverDays: number;
};

export const DEFAULT_LEAVE_SETTINGS: LeaveSettings = {
  annualEntitlementDays: 12,
  carryOverDays: 0
};

export type LeaveBalanceRow = { startDate: Date; days: number; status: LeaveStatus };

export type LeaveBalance = {
  year: number;
  usedDays: number;
  remainingDays: number;
  settings: LeaveSettings;
};

/** Số ngày nghỉ (inclusive, chỉ tính theo phần ngày), trả 0 nếu end < start. */
export function computeLeaveDays(start: Date, end: Date): number {
  const s = toUtcDay(start);
  const e = toUtcDay(end);
  if (e < s) return 0;
  return Math.floor((e - s) / MS_PER_DAY) + 1;
}

function toUtcDay(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Đọc cấu hình ngưỡng phép từ Json SystemSetting (bền vững với dữ liệu cũ). */
export function parseLeaveSettings(raw: unknown): LeaveSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_LEAVE_SETTINGS;
  const r = raw as Record<string, unknown>;
  const num = (k: string): number | undefined =>
    typeof r[k] === "number" && Number.isFinite(r[k]) ? (r[k] as number) : undefined;
  return {
    annualEntitlementDays: num("annualEntitlementDays") ?? DEFAULT_LEAVE_SETTINGS.annualEntitlementDays,
    carryOverDays: num("carryOverDays") ?? DEFAULT_LEAVE_SETTINGS.carryOverDays
  };
}

/** usedDays = Σ ngày của đơn ACTIVE trong năm bất kỳ. */
export function computeUsedDays(rows: LeaveBalanceRow[], year: number): number {
  return rows
    .filter((r) => ACTIVE_LEAVE_STATUSES.includes(r.status) && r.startDate.getFullYear() === year)
    .reduce((sum, r) => sum + r.days, 0);
}

export function buildLeaveBalance(
  rows: LeaveBalanceRow[],
  settings: LeaveSettings,
  year: number
): LeaveBalance {
  const usedDays = computeUsedDays(rows, year);
  const entitled = settings.annualEntitlementDays + settings.carryOverDays;
  return {
    year,
    usedDays,
    remainingDays: Math.max(0, entitled - usedDays),
    settings
  };
}
