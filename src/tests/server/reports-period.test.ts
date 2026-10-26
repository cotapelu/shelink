/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
import { describe, it, expect } from "vitest";
import { periodPresets, customPeriod } from "@/server/reports/queries";

function ymd(d: Date): [number, number, number] {
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
}

describe("periodPresets", () => {
  it("2026-05-26 → Tháng này = 2026-05-01 đến 2026-06-01", () => {
    const p = periodPresets(new Date(2026, 4, 26));
    expect(ymd(p.month.start)).toEqual([2026, 5, 1]);
    expect(ymd(p.month.end)).toEqual([2026, 6, 1]);
    expect(p.month.label).toBe("Tháng 5/2026");
  });

  it("2026-05-26 → Quý này = 2026 Q2 (4-7 tháng)", () => {
    const p = periodPresets(new Date(2026, 4, 26));
    expect(ymd(p.quarter.start)).toEqual([2026, 4, 1]);
    expect(ymd(p.quarter.end)).toEqual([2026, 7, 1]);
    expect(p.quarter.label).toBe("Q2/2026");
  });

  it("2026-05-26 → Năm này = 2026-01-01 đến 2027-01-01", () => {
    const p = periodPresets(new Date(2026, 4, 26));
    expect(ymd(p.year.start)).toEqual([2026, 1, 1]);
    expect(ymd(p.year.end)).toEqual([2027, 1, 1]);
    expect(p.year.label).toBe("Năm 2026");
  });

  it("2026-05-26 → Năm trước = 2025-01-01 đến 2026-01-01", () => {
    const p = periodPresets(new Date(2026, 4, 26));
    expect(ymd(p.lastYear.start)).toEqual([2025, 1, 1]);
    expect(ymd(p.lastYear.end)).toEqual([2026, 1, 1]);
    expect(p.lastYear.label).toBe("Năm 2025");
  });

  it("Biên Q1 (tháng 1)", () => {
    const p = periodPresets(new Date(2026, 0, 15));
    expect(ymd(p.quarter.start)).toEqual([2026, 1, 1]);
    expect(ymd(p.quarter.end)).toEqual([2026, 4, 1]);
    expect(p.quarter.label).toBe("Q1/2026");
  });

  it("Biên Q4 (tháng 12), cuối tháng năm nay vượt năm", () => {
    const p = periodPresets(new Date(2026, 11, 31));
    expect(ymd(p.month.start)).toEqual([2026, 12, 1]);
    expect(ymd(p.month.end)).toEqual([2027, 1, 1]);
    expect(ymd(p.quarter.start)).toEqual([2026, 10, 1]);
    expect(ymd(p.quarter.end)).toEqual([2027, 1, 1]);
  });
});

describe("customPeriod", () => {
  it("2026-01-01 ~ 2026-03-31 → start=01-01, end=04-01 (gồm ngày cuối → nửa mở +1)", () => {
    const p = customPeriod("2026-01-01", "2026-03-31");
    expect(ymd(p.start)).toEqual([2026, 1, 1]);
    expect(ymd(p.end)).toEqual([2026, 4, 1]);
    expect(p.label).toBe("2026-01-01 ~ 2026-03-31");
  });

  it("Cuối tháng tăng đúng khi qua tháng (2026-01-31 → 2026-02-01)", () => {
    const p = customPeriod("2026-01-01", "2026-01-31");
    expect(ymd(p.end)).toEqual([2026, 2, 1]);
  });

  it("Báo lỗi khi định dạng ngày không hợp lệ", () => {
    expect(() => customPeriod("2026/01/01", "2026-03-31")).toThrow(/hợp lệ/i);
    expect(() => customPeriod("2026-1-1", "2026-3-31")).toThrow(/hợp lệ/i);
  });

  it("Cùng một ngày vẫn hợp lệ (gồm ngày → sau khi nửa mở +1 vẫn > start)", () => {
    expect(() => customPeriod("2026-03-01", "2026-03-01")).not.toThrow();
  });

  it("Báo lỗi khi end < start", () => {
    expect(() => customPeriod("2026-03-01", "2026-02-28")).toThrow(/sau/i);
  });

  it("Báo lỗi khi khoảng > 5 năm", () => {
    expect(() => customPeriod("2020-01-01", "2026-01-02")).toThrow(/5 năm/);
  });

  it("Đúng trong vòng 5 năm thì hợp lệ", () => {
    expect(() => customPeriod("2021-01-01", "2025-12-31")).not.toThrow();
  });
});
