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
import { weekPeriod, formatWeeklyDigestContent } from "@/server/reports/weekly";

function ymd(d: Date): [number, number, number] {
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
}

describe("weekPeriod", () => {
  it("周二 2026-05-26 → 周一 05-25 到下周一 06-01", () => {
    const p = weekPeriod(new Date(2026, 4, 26));
    expect(ymd(p.start)).toEqual([2026, 5, 25]);
    expect(ymd(p.end)).toEqual([2026, 6, 1]);
    expect(p.label).toBe("2026-05-25 ~ 2026-05-31");
  });

  it("周一 2026-05-25 当天本身 → 本周一即 05-25", () => {
    const p = weekPeriod(new Date(2026, 4, 25));
    expect(ymd(p.start)).toEqual([2026, 5, 25]);
    expect(ymd(p.end)).toEqual([2026, 6, 1]);
  });

  it("周日 2026-05-31 → 仍属本周（5/25-5/31）", () => {
    const p = weekPeriod(new Date(2026, 4, 31));
    expect(ymd(p.start)).toEqual([2026, 5, 25]);
    expect(ymd(p.end)).toEqual([2026, 6, 1]);
  });

  it("跨年：周二 2026-12-29 → 本周一 12-28 到下周一 2027-01-04", () => {
    const p = weekPeriod(new Date(2026, 11, 29));
    expect(ymd(p.start)).toEqual([2026, 12, 28]);
    expect(ymd(p.end)).toEqual([2027, 1, 4]);
  });
});

describe("formatWeeklyDigestContent", () => {
  it("拼接 4 项数据，金额带千分位 + 2 位小数", () => {
    const text = formatWeeklyDigestContent({
      userId: "u1",
      userName: "张三",
      period: weekPeriod(new Date(2026, 4, 26)),
      newIntake: 3,
      closed: 1,
      archived: 2,
      receivedAmount: 125000.5
    });
    expect(text).toContain("新收 3 件");
    expect(text).toContain("已结 1 件");
    expect(text).toContain("已归档 2 件");
    expect(text).toContain("125,000.50 元");
  });

  it("零值也照常拼", () => {
    const text = formatWeeklyDigestContent({
      userId: "u1",
      userName: "李四",
      period: weekPeriod(),
      newIntake: 0,
      closed: 0,
      archived: 0,
      receivedAmount: 0
    });
    expect(text).toContain("0.00 元");
    expect(text.split("·")).toHaveLength(4);
  });
});
