import { describe, it, expect } from "vitest";
import {
  computeLeaveDays,
  computeUsedDays,
  buildLeaveBalance,
  parseLeaveSettings,
  DEFAULT_LEAVE_SETTINGS,
  type LeaveBalanceRow
} from "./balance";

describe("computeLeaveDays", () => {
  it("inclusive day count", () => {
    expect(computeLeaveDays(new Date(2026, 0, 1), new Date(2026, 0, 3))).toBe(3);
    expect(computeLeaveDays(new Date(2026, 0, 5), new Date(2026, 0, 5))).toBe(1);
  });
  it("0 when end < start", () => {
    expect(computeLeaveDays(new Date(2026, 0, 5), new Date(2026, 0, 1))).toBe(0);
  });
});

describe("parseLeaveSettings", () => {
  it("defaults for missing/invalid", () => {
    expect(parseLeaveSettings(null)).toEqual(DEFAULT_LEAVE_SETTINGS);
    expect(parseLeaveSettings({ annualEntitlementDays: "x" })).toEqual(DEFAULT_LEAVE_SETTINGS);
  });
  it("merges partial valid values", () => {
    expect(parseLeaveSettings({ annualEntitlementDays: 14 })).toEqual({
      annualEntitlementDays: 14,
      carryOverDays: 0
    });
  });
});

describe("computeUsedDays / buildLeaveBalance", () => {
  const rows: LeaveBalanceRow[] = [
    { startDate: new Date(2026, 2, 1), days: 3, status: "APPROVED" },
    { startDate: new Date(2026, 4, 1), days: 2, status: "SUBMITTED" },
    { startDate: new Date(2026, 6, 1), days: 5, status: "REJECTED" },
    { startDate: new Date(2026, 8, 1), days: 5, status: "DRAFT" },
    { startDate: new Date(2025, 8, 1), days: 9, status: "APPROVED" }
  ];
  it("only counts ACTIVE statuses in the same year", () => {
    expect(computeUsedDays(rows, 2026)).toBe(5);
  });
  it("remaining = entitlement + carryOver - used, floored at 0", () => {
    const bal = buildLeaveBalance(rows, { annualEntitlementDays: 10, carryOverDays: 2 }, 2026);
    expect(bal).toMatchObject({ year: 2026, usedDays: 5, remainingDays: 7 });
    const zero = buildLeaveBalance(rows, { annualEntitlementDays: 1, carryOverDays: 0 }, 2026);
    expect(zero.remainingDays).toBe(0);
  });
});
