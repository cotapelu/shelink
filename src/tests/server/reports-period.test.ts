/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { describe, it, expect } from "vitest";
import { periodPresets, customPeriod } from "@/server/reports/queries";

function ymd(d: Date): [number, number, number] {
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
}

describe("periodPresets", () => {
  it("2026-05-26 → 本月 = 2026-05-01 到 2026-06-01", () => {
    const p = periodPresets(new Date(2026, 4, 26));
    expect(ymd(p.month.start)).toEqual([2026, 5, 1]);
    expect(ymd(p.month.end)).toEqual([2026, 6, 1]);
    expect(p.month.label).toBe("2026 年 5 月");
  });

  it("2026-05-26 → 本季 = 2026 Q2（4-7 月）", () => {
    const p = periodPresets(new Date(2026, 4, 26));
    expect(ymd(p.quarter.start)).toEqual([2026, 4, 1]);
    expect(ymd(p.quarter.end)).toEqual([2026, 7, 1]);
    expect(p.quarter.label).toBe("2026 年 Q2");
  });

  it("2026-05-26 → 本年 = 2026-01-01 到 2027-01-01", () => {
    const p = periodPresets(new Date(2026, 4, 26));
    expect(ymd(p.year.start)).toEqual([2026, 1, 1]);
    expect(ymd(p.year.end)).toEqual([2027, 1, 1]);
    expect(p.year.label).toBe("2026 年度");
  });

  it("2026-05-26 → 上年 = 2025-01-01 到 2026-01-01", () => {
    const p = periodPresets(new Date(2026, 4, 26));
    expect(ymd(p.lastYear.start)).toEqual([2025, 1, 1]);
    expect(ymd(p.lastYear.end)).toEqual([2026, 1, 1]);
    expect(p.lastYear.label).toBe("2025 年度");
  });

  it("Q1（1 月）边界", () => {
    const p = periodPresets(new Date(2026, 0, 15));
    expect(ymd(p.quarter.start)).toEqual([2026, 1, 1]);
    expect(ymd(p.quarter.end)).toEqual([2026, 4, 1]);
    expect(p.quarter.label).toBe("2026 年 Q1");
  });

  it("Q4（12 月）边界，本月 end 跨年", () => {
    const p = periodPresets(new Date(2026, 11, 31));
    expect(ymd(p.month.start)).toEqual([2026, 12, 1]);
    expect(ymd(p.month.end)).toEqual([2027, 1, 1]);
    expect(ymd(p.quarter.start)).toEqual([2026, 10, 1]);
    expect(ymd(p.quarter.end)).toEqual([2027, 1, 1]);
  });
});

describe("customPeriod", () => {
  it("2026-01-01 ~ 2026-03-31 → start=01-01, end=04-01（含末日 → 半开 +1）", () => {
    const p = customPeriod("2026-01-01", "2026-03-31");
    expect(ymd(p.start)).toEqual([2026, 1, 1]);
    expect(ymd(p.end)).toEqual([2026, 4, 1]);
    expect(p.label).toBe("2026-01-01 ~ 2026-03-31");
  });

  it("月末跨月正确递增（2026-01-31 → 2026-02-01）", () => {
    const p = customPeriod("2026-01-01", "2026-01-31");
    expect(ymd(p.end)).toEqual([2026, 2, 1]);
  });

  it("日期格式不合法抛错", () => {
    expect(() => customPeriod("2026/01/01", "2026-03-31")).toThrow(/格式/);
    expect(() => customPeriod("2026-1-1", "2026-3-31")).toThrow(/格式/);
  });

  it("同一天合法（含当天 → 半开 +1 后仍 > start）", () => {
    expect(() => customPeriod("2026-03-01", "2026-03-01")).not.toThrow();
  });

  it("end < start 抛错", () => {
    expect(() => customPeriod("2026-03-01", "2026-02-28")).toThrow(/晚于/);
  });

  it("跨度 > 5 年抛错", () => {
    expect(() => customPeriod("2020-01-01", "2026-01-02")).toThrow(/5 年/);
  });

  it("正好 5 年内合法", () => {
    expect(() => customPeriod("2021-01-01", "2025-12-31")).not.toThrow();
  });
});
