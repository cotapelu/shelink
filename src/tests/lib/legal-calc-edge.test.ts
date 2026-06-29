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

// Helper to compute property tier formula
function amountToFormula(amount: number, rate: number, constant: number): number {
  return Math.round(amount * rate + constant);
}

describe("calcCourtFee - Edge Cases & Boundaries", () => {
  it("PROPERTY: boundary at 10,000 (tier 1 upper)", () => {
    const res = calcCourtFee({ caseType: "PROPERTY", amount: 10_000 });
    expect(res.fee).toBe(50);
  });

  it("PROPERTY: boundary at 100,000 (tier 2 upper)", () => {
    const res = calcCourtFee({ caseType: "PROPERTY", amount: 100_000 });
    expect(res.fee).toBe(amountToFormula(100_000, 0.025, -200)); // 2300
  });

  it("PROPERTY: boundary at 200,000 (tier 3 upper)", () => {
    const res = calcCourtFee({ caseType: "PROPERTY", amount: 200_000 });
    expect(res.fee).toBe(amountToFormula(200_000, 0.02, 300)); // 4300
  });

  it("PROPERTY: boundary at 500,000 (tier 4 upper)", () => {
    const res = calcCourtFee({ caseType: "PROPERTY", amount: 500_000 });
    expect(res.fee).toBe(amountToFormula(500_000, 0.015, 1300)); // 8800
  });

  it("PROPERTY: boundary at 1,000,000 (tier 5 upper)", () => {
    const res = calcCourtFee({ caseType: "PROPERTY", amount: 1_000_000 });
    expect(res.fee).toBe(amountToFormula(1_000_000, 0.01, 3800)); // 13800
  });

  it("PROPERTY: boundary at 2,000,000 (tier 6 upper)", () => {
    const res = calcCourtFee({ caseType: "PROPERTY", amount: 2_000_000 });
    expect(res.fee).toBe(amountToFormula(2_000_000, 0.009, 4800)); // 22800
  });

  it("PROPERTY: boundary at 5,000,000 (tier 7 upper)", () => {
    const res = calcCourtFee({ caseType: "PROPERTY", amount: 5_000_000 });
    expect(res.fee).toBe(amountToFormula(5_000_000, 0.008, 6800)); // 46800
  });

  it("PROPERTY: boundary at 10,000,000 (tier 8 upper)", () => {
    const res = calcCourtFee({ caseType: "PROPERTY", amount: 10_000_000 });
    expect(res.fee).toBe(amountToFormula(10_000_000, 0.007, 11800)); // 81800
  });

  it("PROPERTY: boundary at 20,000,000 (tier 9 upper)", () => {
    const res = calcCourtFee({ caseType: "PROPERTY", amount: 20_000_000 });
    expect(res.fee).toBe(amountToFormula(20_000_000, 0.006, 21800)); // 141800
  });

  it("PROPERTY: amount > 20,000,000 (top tier)", () => {
    const res = calcCourtFee({ caseType: "PROPERTY", amount: 25_000_000 });
    expect(res.fee).toBe(amountToFormula(25_000_000, 0.005, 41800)); // 166800
  });

  it("PROPERTY: feeSimplified is exactly half and rounded", () => {
    const res = calcCourtFee({ caseType: "PROPERTY", amount: 123_456 });
    expect(res.feeSimplified).toBe(Math.round(res.fee / 2));
  });

  it("DIVORCE: exact 200,000 boundary (no extra)", () => {
    const res = calcCourtFee({ caseType: "DIVORCE", amount: 200_000 });
    expect(res.fee).toBe(300);
    expect(res.note).toContain("300");
  });

  it("DIVORCE: just above 200,000 triggers extra", () => {
    const res = calcCourtFee({ caseType: "DIVORCE", amount: 200_001 });
    // base 300 + (1 * 0.005) = 300 + 0.005 → round to 300
    expect(res.fee).toBe(300);
  });

  it("amount undefined defaults to 0 for PROPERTY", () => {
    const res = calcCourtFee({ caseType: "PROPERTY" });
    expect(res.amount).toBe(0);
    expect(res.fee).toBe(50);
  });

  it("amount 0 for LABOR returns fixed 10", () => {
    const res = calcCourtFee({ caseType: "LABOR", amount: 0 });
    expect(res.fee).toBe(10);
  });

  it("amount 0 for DIVORCE returns base 300", () => {
    const res = calcCourtFee({ caseType: "DIVORCE", amount: 0 });
    expect(res.fee).toBe(300);
  });
});

describe("calcLateInterest - Edge Cases", () => {
  it("paid before dueDate yields 0 daysLate and 0 interest", () => {
    const due = new Date("2024-01-10");
    const paid = new Date("2024-01-05");
    const res = calcLateInterest({
      principal: 100_000,
      dueDate: due,
      paidDate: paid
    });
    expect(res.daysLate).toBe(0);
    expect(res.interest).toBe(0);
    expect(res.totalToPay).toBe(100_000);
  });

  it("zero principal yields zero interest", () => {
    const due = new Date("2024-01-01");
    const paid = new Date("2024-02-01");
    const res = calcLateInterest({
      principal: 0,
      dueDate: due,
      paidDate: paid
    });
    expect(res.interest).toBe(0);
    expect(res.totalToPay).toBe(0);
  });

  it("handles leap year day count correctly", () => {
    // 2024 is leap year: Jan 1 to Mar 1 = 60 days (29+31+?). Actually Feb has 29.
    const due = new Date("2024-01-01");
    const paid = new Date("2024-03-01"); // 60 days (Jan 31 + Feb 29 = 60)
    const res = calcLateInterest({
      principal: 100_000,
      dueDate: due,
      paidDate: paid,
      lprPercent: 3.45,
      extraPercent: 5
    });
    expect(res.daysLate).toBe(60);
  });

  it("custom LPR and extra rates", () => {
    const due = new Date("2024-01-01");
    const paid = new Date("2024-01-11"); // 10 days
    const res = calcLateInterest({
      principal: 100_000,
      dueDate: due,
      paidDate: paid,
      lprPercent: 4.0,
      extraPercent: 6
    });
    expect(res.yearlyRate).toBeCloseTo(0.10, 4);
    // interest = 100000 * 0.10 * 10 / 365 ≈ 273.97
    expect(res.interest).toBeCloseTo(273.97, 1);
  });

  it("large principal does not overflow", () => {
    const due = new Date("2024-01-01");
    const paid = new Date("2024-01-31"); // 30 days
    const res = calcLateInterest({
      principal: 999_999_999,
      dueDate: due,
      paidDate: paid
    });
    expect(res.interest).toBeGreaterThan(0);
    expect(typeof res.interest).toBe("number");
    expect(res.interest).toBeLessThan(1e9);
  });
});

describe("daysBetween - Edge Cases", () => {
  it("same date returns 0", () => {
    const d = new Date("2024-01-15");
    expect(daysBetween(d, d)).toBe(0);
    expect(daysBetween(d, d, true)).toBe(0);
  });

  it("crossing month/year boundaries", () => {
    const dec = new Date("2024-12-20");
    const jan = new Date("2025-01-10");
    expect(daysBetween(dec, jan)).toBe(21);
    expect(daysBetween(jan, dec)).toBe(-21);
  });

  it("excludeWeekend with negative direction", () => {
    // Mon Jan 8 to Fri Jan 5: reverse, count weekdays backwards
    const a = new Date("2024-01-08"); // Mon
    const b = new Date("2024-01-05"); // Fri
    expect(daysBetween(a, b, true)).toBe(-1); // only Fri is weekday count going backwards
  });

  it("excludeWeekend skipping multiple weekends", () => {
    // Wed to next Wed (10 days, 4 weekend days -> 6 weekdays if inclusive? Actually function counts days moving forward step-by-step)
    // Let's check: Wed Jan 10 to Sat Jan 20 includes two weekends.
    const start = new Date("2024-01-10"); // Wed
    const end = new Date("2024-01-20"); // Sat
    // Without exclusion: 10 days (inclusive? Actually end-start = 10)
    // With exclusion: count only weekdays (Mon-Fri). Jan 10 Wed to Jan 20 Sat: weekdays Jan 10-12 (3), Jan 15-19 (5) => 8? Let's compute via algorithm: start->end moving daily, counts each step. From Wed 10 to Sat 20: days: 11(Thu),12(Fri),13(Sat)-skip,14(Sun)-skip,15(Mon),16(Tue),17(Wed),18(Thu),19(Fri),20(Sat)-arrive. Steps: 11,12,15,16,17,18,19 -> that's 7 counts? Actually while loop increments cur until target; it counts sign each step if weekday. Let's trust function. We'll assert against known result.
    const noExclude = daysBetween(start, end); // 10
    const withExclude = daysBetween(start, end, true);
    expect(withExclude).toBeLessThan(noExclude);
    // Known: Jan 10->20: 10 calendar, weekdays: Thu, Fri, Mon, Tue, Wed, Thu, Fri = 7
    expect(withExclude).toBe(7);
  });
});

describe("addDays - Edge Cases", () => {
  it("adds days crossing month boundary", () => {
    const d = new Date("2024-01-28");
    const result = addDays(d, 5);
    expect(result.getDate()).toBe(2); // Feb 2
    expect(result.getMonth()).toBe(1); // Feb
  });

  it("adds days crossing year boundary", () => {
    const d = new Date("2024-12-30");
    const result = addDays(d, 5);
    expect(result.getDate()).toBe(4); // Jan 4
    expect(result.getFullYear()).toBe(2025);
  });

  it("subtracts days crossing month boundary", () => {
    const d = new Date("2024-03-03");
    const result = addDays(d, -5);
    expect(result.getDate()).toBe(27);
    expect(result.getMonth()).toBe(1); // Feb
  });

  it("subtracts days crossing year boundary", () => {
    const d = new Date("2024-01-03");
    const result = addDays(d, -5);
    expect(result.getDate()).toBe(29);
    expect(result.getFullYear()).toBe(2023);
  });

  it("handles leap year Feb 29 addition", () => {
    const d = new Date("2024-02-28");
    const result = addDays(d, 2);
    expect(result.getDate()).toBe(1); // Mar 1
    expect(result.getMonth()).toBe(2); // Mar
  });

  it("handles non-leap year Feb 28 addition", () => {
    const d = new Date("2023-02-28");
    const result = addDays(d, 1);
    expect(result.getDate()).toBe(1); // Mar 1
    expect(result.getMonth()).toBe(2); // Mar
  });
});

describe("numberToChinese - Edge Cases", () => {
  it("converts 0 as 零元整", () => {
    expect(numberToChinese(0)).toBe("零元整");
  });

  it("handles exactly 10,000 (壹万元整)", () => {
    expect(numberToChinese(10_000)).toBe("壹万元整");
  });

  it("handles 100,000 (壹拾万元整)", () => {
    expect(numberToChinese(100_000)).toBe("壹拾万元整");
  });

  it("handles 1,000,000 (壹佰万元整)", () => {
    expect(numberToChinese(1_000_000)).toBe("壹佰万元整");
  });

  it("handles 100,000,000 (壹亿元整)", () => {
    expect(numberToChinese(100_000_000)).toBe("壹亿元整");
  });

  it("handles 10,000,000,000 (壹佰亿元整)", () => {
    expect(numberToChinese(10_000_000_000)).toBe("壹佰亿元整");
  });

  it("handles 0.00 (零元整)", () => {
    expect(numberToChinese(0.0)).toBe("零元整");
  });

  it("handles 0.01 (零元零壹分)", () => {
    expect(numberToChinese(0.01)).toBe("零元零壹分");
  });

  it("handles 0.10 (零元壹角)", () => {
    expect(numberToChinese(0.1)).toBe("零元壹角");
  });

  it("handles 0.11 (零元壹角壹分)", () => {
    expect(numberToChinese(0.11)).toBe("零元壹角壹分");
  });

  it("handles 999.99 with完整角分", () => {
    expect(numberToChinese(999.99)).toBe("玖佰玖拾玖元玖角玖分");
  });

  it("preserves negative for all ranges", () => {
    expect(numberToChinese(-123.45)).toBe("负壹佰贰拾叁元肆角伍分");
  });

  it("handles number with internal zeros in 万 group", () => {
    expect(numberToChinese(1_000_001)).toBe("壹佰万壹元整");
  });
});
