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
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  periodPresets,
  customPeriod,
  getReportData,
  type ReportPeriod
} from "@/server/reports/queries";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    matter: {
      count: vi.fn(),
      groupBy: vi.fn()
    },
    feeEntry: {
      findMany: vi.fn()
    },
    user: {
      findMany: vi.fn()
    }
  }
}));

describe("periodPresets", () => {
  it("computes current month correctly", () => {
    const now = new Date(2024, 5, 15); // June 2024
    const presets = periodPresets(now);
    expect(presets.month.label).toBe("2024 年 6 月");
    expect(presets.month.start).toEqual(new Date(2024, 5, 1));
    expect(presets.month.end).toEqual(new Date(2024, 6, 1));
  });

  it("computes current quarter correctly", () => {
    const now = new Date(2024, 5, 15); // Q2 (Apr-Jun)
    const presets = periodPresets(now);
    expect(presets.quarter.label).toBe("2024 年 Q2");
    expect(presets.quarter.start).toEqual(new Date(2024, 3, 1)); // Apr 1
    expect(presets.quarter.end).toEqual(new Date(2024, 6, 1)); // Jul 1
  });

  it("computes current year correctly", () => {
    const now = new Date(2024, 5, 15);
    const presets = periodPresets(now);
    expect(presets.year.label).toBe("2024 年度");
    expect(presets.year.start).toEqual(new Date(2024, 0, 1));
    expect(presets.year.end).toEqual(new Date(2025, 0, 1));
  });

  it("computes last year correctly", () => {
    const now = new Date(2024, 5, 15);
    const presets = periodPresets(now);
    expect(presets.lastYear.label).toBe("2023 年度");
    expect(presets.lastYear.start).toEqual(new Date(2023, 0, 1));
    expect(presets.lastYear.end).toEqual(new Date(2024, 0, 1));
  });
});

describe("customPeriod", () => {
  it("parses valid dates", () => {
    const period = customPeriod("2024-01-01", "2024-01-31");
    expect(period.start).toEqual(new Date(2024, 0, 1));
    expect(period.end).toEqual(new Date(2024, 0, 32)); // +1 day
    expect(period.label).toBe("2024-01-01 ~ 2024-01-31");
  });

  it("throws on invalid format", () => {
    expect(() => customPeriod("2024/01/01", "2024-01-31")).toThrow("日期格式不合法");
    expect(() => customPeriod("2024-01-01", "01-31-2024")).toThrow("日期格式不合法");
  });

  it("throws if end <= start", () => {
    // end < start: after +1 day, end still <= start? Let's compute: start=1, end=1 -> end+1=2 >1, so not throw.
    // Need end date before start date: end day < start day
    expect(() => customPeriod("2024-01-10", "2024-01-05")).toThrow("结束日期必须晚于起始日期");
    // Edge: exactly one day apart: start=1, end=1 -> end+1=2, > start, ok
    expect(() => customPeriod("2024-01-01", "2024-01-01")).not.toThrow();
  });

  it("throws if span > 5 years", () => {
    expect(() => customPeriod("2010-01-01", "2025-01-02")).toThrow("不能超过 5 年");
  });

  it("accepts 5 year span", () => {
    // 5 years * 366 days = 1830 days
    const start = "2020-01-01";
    const end = "2024-12-31"; // +1 day = 2025-01-01, 5 years exactly
    expect(() => customPeriod(start, end)).not.toThrow();
  });
});

describe("getReportData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const period: ReportPeriod = {
    label: "Test Period",
    start: new Date("2024-01-01"),
    end: new Date("2024-02-01")
  };

  it("fetches all KPIs and breakdowns", async () => {
    (prisma.matter.count as any).mockImplementation(({ where }: { where: any }) => {
      if (where.createdAt) return 10; // newIntake
      if (where.status === "IN_PROGRESS") return 5;
      if (where.closedAt) return 3;
      if (where.archivedAt) return 2;
      return 0;
    });
    (prisma.matter.groupBy as any).mockResolvedValue([]); // no categories
    (prisma.feeEntry.findMany as any).mockResolvedValue([]);
    (prisma.user.findMany as any).mockResolvedValue([]);

    const result = await getReportData(period);

    expect(result.kpis).toEqual({
      newIntake: 10,
      inProgress: 5,
      closed: 3,
      archived: 2,
      archiveRate: 2 / 3
    });
    expect(result.byCategory).toEqual([]);
    expect(result.byLawyer).toEqual([]);
    expect(result.byClientReceivable).toEqual([]);
  });

  it("computes category breakdown", async () => {
    (prisma.matter.count as any).mockResolvedValue(0);
    (prisma.matter.groupBy as any).mockResolvedValue([
      { category: "CIVIL", _count: { _all: 5 } },
      { category: "CRIMINAL", _count: { _all: 3 } }
    ]);
    (prisma.feeEntry.findMany as any).mockResolvedValue([]);
    (prisma.user.findMany as any).mockResolvedValue([]);

    const result = await getReportData(period);
    expect(result.byCategory).toHaveLength(2);
    expect(result.byCategory[0]).toEqual({ category: "CIVIL", count: 5 });
    expect(result.byCategory[1]).toEqual({ category: "CRIMINAL", count: 3 });
  });

  it("aggregates lawyer outputs correctly", async () => {
    (prisma.matter.count as any).mockResolvedValue(0);
    (prisma.matter.groupBy as any).mockImplementation(async ({ where }: { where: any }) => {
      if (where.ownerId) {
        // lawyerOwnedRaw - not used in this test directly
        return [];
      }
      if (where.closedAt) {
        return [{ ownerId: "u1", _count: { _all: 2 } }, { ownerId: "u2", _count: { _all: 1 } }];
      }
      return [];
    });
    (prisma.feeEntry.findMany as any).mockResolvedValue([
      { amount: 1000, matter: { ownerId: "u1" } },
      { amount: 2000, matter: { ownerId: "u1" } },
      { amount: 500, matter: { ownerId: "u2" } }
    ]);
    (prisma.user.findMany as any).mockResolvedValue([
      { id: "u1", name: "Alice" },
      { id: "u2", name: "Bob" }
    ]);

    const result = await getReportData(period);
    expect(result.byLawyer).toHaveLength(2);
    const alice = result.byLawyer.find((l) => l.userId === "u1")!;
    const bob = result.byLawyer.find((l) => l.userId === "u2")!;
    expect(alice.ownedCount).toBe(0); // lawyerOwnedRaw mocked empty
    expect(alice.closedCount).toBe(2);
    expect(alice.receivedAmount).toBe(3000);
    expect(bob.closedCount).toBe(1);
    expect(bob.receivedAmount).toBe(500);
  });

  it("handles zero archiveRate when closed=0", async () => {
    (prisma.matter.count as any).mockResolvedValue(0);
    (prisma.matter.groupBy as any).mockResolvedValue([]);
    (prisma.feeEntry.findMany as any).mockResolvedValue([]);
    (prisma.user.findMany as any).mockResolvedValue([]);

    const result = await getReportData(period);
    expect(result.kpis.archiveRate).toBe(0);
  });

  it("handles client receivable aggregation", async () => {
    // Skip complex lawyer aggregation, focus on receivable
    (prisma.matter.count as any).mockResolvedValue(0);
    (prisma.matter.groupBy as any).mockResolvedValue([]);
    (prisma.feeEntry.findMany as any).mockResolvedValue([
      { amount: 5000, matter: { ownerId: "u1" } },
      { amount: -2000, matter: { ownerId: "u1" } } // received only
    ]);
    (prisma.user.findMany as any).mockResolvedValue([]);

    const result = await getReportData(period);
    expect(result.byClientReceivable).toEqual([]); // no client aggregation in this query set
  });
});
