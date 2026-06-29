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
import {
  calcCourtFee,
  calcLateInterest,
  daysBetween,
  addDays,
  numberToChinese
} from "@/lib/legal-calc";

describe("calcCourtFee", () => {
  it("PROPERTY: fee for 5,000", () => {
    const res = calcCourtFee({ caseType: "PROPERTY", amount: 5000 });
    expect(res.fee).toBe(50);
    expect(res.feeSimplified).toBe(25);
  });

  it("PROPERTY: fee for 50,000", () => {
    const res = calcCourtFee({ caseType: "PROPERTY", amount: 50000 });
    // 50,000 <= 100,000: 50000 * 0.025 - 200 = 1050
    expect(res.fee).toBe(1050);
    expect(res.feeSimplified).toBe(525);
  });

  it("PROPERTY: fee for 150,000", () => {
    const res = calcCourtFee({ caseType: "PROPERTY", amount: 150000 });
    // 150,000 <= 200,000: 150000 * 0.02 + 300 = 3300
    expect(res.fee).toBe(3300);
  });

  it("PROPERTY: fee for 300,000", () => {
    const res = calcCourtFee({ caseType: "PROPERTY", amount: 300000 });
    // 300,000 <= 500,000: 300000 * 0.015 + 1300 = 5800
    expect(res.fee).toBe(5800);
  });

  it("DIVORCE: fee without extra property", () => {
    const res = calcCourtFee({ caseType: "DIVORCE", amount: 100000 });
    // base 300, no extra (<=200k)
    expect(res.fee).toBe(300);
    expect(res.note).toContain("300");
  });

  it("DIVORCE: fee with extra property", () => {
    const res = calcCourtFee({ caseType: "DIVORCE", amount: 500_000 });
    // base 300 + (500000 - 200000) * 0.005 = 300 + 1500 = 1800
    expect(res.fee).toBe(1800);
    expect(res.note).toContain("财产分割");
  });

  it("LABOR: fixed fee", () => {
    const res = calcCourtFee({ caseType: "LABOR" });
    expect(res.fee).toBe(10);
    expect(res.feeSimplified).toBe(5);
  });

  it("IP: fixed fee", () => {
    const res = calcCourtFee({ caseType: "IP" });
    expect(res.fee).toBe(1000);
  });

  it("OTHER: fixed fee", () => {
    const res = calcCourtFee({ caseType: "OTHER" });
    expect(res.fee).toBe(100);
  });
});

describe("calcLateInterest", () => {
  it("calculates interest correctly", () => {
    const due = new Date("2024-01-01");
    const paid = new Date("2024-02-01"); // 31 days
    const res = calcLateInterest({
      principal: 100_000,
      dueDate: due,
      paidDate: paid,
      lprPercent: 3.45,
      extraPercent: 5
    });
    // yearlyRate = (3.45 + 5) / 100 = 0.0845
    // interest = 100000 * 0.0845 * 31 / 365 ≈ 718.xx
    expect(res.daysLate).toBe(31);
    expect(res.yearlyRate).toBeCloseTo(0.0845, 4);
    expect(res.interest).toBeGreaterThan(700);
    expect(res.interest).toBeLessThan(800);
    expect(res.totalToPay).toBeGreaterThan(100_700);
  });

  it("no interest if paid on time", () => {
    const due = new Date("2024-01-01");
    const res = calcLateInterest({
      principal: 100_000,
      dueDate: due,
      paidDate: due
    });
    expect(res.daysLate).toBe(0);
    expect(res.interest).toBe(0);
    expect(res.totalToPay).toBe(100_000);
  });
});

describe("daysBetween", () => {
  it("calculates days between two dates", () => {
    const a = new Date("2024-01-01");
    const b = new Date("2024-01-10");
    expect(daysBetween(a, b)).toBe(9);
    expect(daysBetween(b, a)).toBe(-9);
  });

  it("excludes weekends when requested", () => {
    // Fri Jan 5 to Mon Jan 8: 3 calendar days, 1 weekday (Mon)
    const a = new Date("2024-01-05"); // Fri
    const b = new Date("2024-01-08"); // Mon
    expect(daysBetween(a, b, true)).toBe(1);
  });
});

describe("addDays", () => {
  it("adds positive days", () => {
    const d = new Date("2024-01-01");
    const result = addDays(d, 10);
    expect(result.getDate()).toBe(11);
    expect(result.getMonth()).toBe(0); // Jan
  });

  it("subtracts days with negative", () => {
    const d = new Date("2024-01-10");
    const result = addDays(d, -5);
    expect(result.getDate()).toBe(5);
  });
});

describe("numberToChinese", () => {
  it("converts 0", () => {
    expect(numberToChinese(0)).toBe("零元整");
  });

  it("converts small numbers", () => {
    expect(numberToChinese(123)).toBe("壹佰贰拾叁元整");
    expect(numberToChinese(105)).toBe("壹佰零伍元整");
    expect(numberToChinese(1005)).toBe("壹仟零伍元整");
  });

  it("converts decimal amounts", () => {
    const res = numberToChinese(123.45);
    expect(res).toContain("壹佰贰拾叁元");
    expect(res).toContain("肆角");
    expect(res).toContain("伍分");
  });

  it("handles negative", () => {
    expect(numberToChinese(-100)).toBe("负壹佰元整");
  });

  it("handles large numbers (亿)", () => {
    const res = numberToChinese(123_456_789);
    expect(res).toContain("亿");
    expect(res).toContain("万");
  });
});
