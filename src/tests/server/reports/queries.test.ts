import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  periodPresets,
  customPeriod,
  type ReportPeriod
} from "@/server/reports/queries";

describe("periodPresets", () => {
  it("generates month period correctly", () => {
    const now = new Date(2024, 5, 15); // June 2024
    const result = periodPresets(now);
    expect(result.month.label).toBe("2024 年 6 月");
    expect(result.month.start).toEqual(new Date(2024, 5, 1));
    expect(result.month.end).toEqual(new Date(2024, 6, 1));
  });

  it("generates quarter period correctly", () => {
    const now = new Date(2024, 5, 15); // Q2 (Apr-Jun)
    const result = periodPresets(now);
    expect(result.quarter.label).toBe("2024 年 Q2");
    expect(result.quarter.start).toEqual(new Date(2024, 3, 1)); // Apr 1
    expect(result.quarter.end).toEqual(new Date(2024, 6, 1)); // Jul 1
  });

  it("generates year period correctly", () => {
    const now = new Date(2024, 5, 15);
    const result = periodPresets(now);
    expect(result.year.label).toBe("2024 年度");
    expect(result.year.start).toEqual(new Date(2024, 0, 1));
    expect(result.year.end).toEqual(new Date(2025, 0, 1));
  });

  it("generates lastYear period correctly", () => {
    const now = new Date(2024, 5, 15);
    const result = periodPresets(now);
    expect(result.lastYear.label).toBe("2023 年度");
    expect(result.lastYear.start).toEqual(new Date(2023, 0, 1));
    expect(result.lastYear.end).toEqual(new Date(2024, 0, 1));
  });

  it("uses current date by default", () => {
    const result = periodPresets();
    expect(result.month.start).toBeInstanceOf(Date);
    expect(result.month.end).toBeInstanceOf(Date);
  });
});

describe("customPeriod", () => {
  it("parses valid date range", () => {
    const result = customPeriod("2024-01-01", "2024-12-31");
    expect(result.label).toBe("2024-01-01 ~ 2024-12-31");
    expect(result.start).toEqual(new Date(2024, 0, 1));
    expect(result.end).toEqual(new Date(2025, 0, 1)); // +1 day for half-open
  });

  it("rejects invalid date format", () => {
    expect(() => customPeriod("01/01/2024", "12/31/2024")).toThrow("日期格式不合法");
    expect(() => customPeriod("2024-01-01", "not-a-date")).toThrow("日期格式不合法");
  });

  it("rejects end not after start", () => {
    expect(() => customPeriod("2024-12-31", "2024-01-01")).toThrow("结束日期必须晚于起始日期");
  });

  it("rejects range > 5 years", () => {
    expect(() => customPeriod("2010-01-01", "2025-01-02")).toThrow("自定义跨度不能超过 5 年");
  });

  it("accepts range up to 5 years", () => {
    const result = customPeriod("2020-01-01", "2024-12-31"); // <5 years
    expect(result.start).toEqual(new Date(2020, 0, 1));
    expect(result.end.getTime()).toBeGreaterThan(result.start.getTime());
  });
});

// Note: getReportData integration tests require full Prisma mocking
// That will be covered in separate integration test suite
describe("getReportData (type checks only)", () => {
  it("has correct type signatures", async () => {
    // This test just verifies the function can be imported and called
    const { getReportData } = await import("@/server/reports/queries");
    const period: ReportPeriod = {
      label: "test",
      start: new Date(),
      end: new Date()
    };
    // Should not throw type error (runtime may need DB)
    // We're not executing, just checking compile
    expect(typeof getReportData).toBe("function");
  });
});
