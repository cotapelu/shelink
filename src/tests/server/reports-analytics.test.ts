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
/**
 * v0.22: 报表 analytics 聚合算法测试（纯函数路径）
 *
 * getCaseCycleAnalysis / getReviewIssueAnalysis 本身依赖 prisma，重写一个纯函数
 * 版本不现实；这里通过 mock prisma 测算法（中位数、空数据、JS 端聚合）。
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const { matterFindManyMock, reviewFindManyMock } = vi.hoisted(() => ({
  matterFindManyMock: vi.fn(),
  reviewFindManyMock: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    matter: { findMany: matterFindManyMock },
    reviewRecord: { findMany: reviewFindManyMock }
  }
}));

import {
  getCaseCycleAnalysis,
  getReviewIssueAnalysis
} from "@/server/reports/analytics";

const period = {
  label: "test",
  start: new Date(2026, 0, 1),
  end: new Date(2027, 0, 1)
};

beforeEach(() => {
  matterFindManyMock.mockReset();
  reviewFindManyMock.mockReset();
});

describe("getCaseCycleAnalysis", () => {
  it("空 → 空数组", async () => {
    matterFindManyMock.mockResolvedValue([]);
    const r = await getCaseCycleAnalysis(period);
    expect(r).toEqual([]);
  });

  it("过滤 closedAt 为 null 的记录", async () => {
    const d = (offset: number) => {
      const dt = new Date(2026, 0, 1);
      dt.setDate(dt.getDate() + offset);
      return dt;
    };
    matterFindManyMock.mockResolvedValue([
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: null },
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(10) }
    ]);
    const r = await getCaseCycleAnalysis(period);
    expect(r).toHaveLength(1);
    expect(r[0].count).toBe(1);
  });

  it("过滤 createdAt >= closedAt 的脏数据", async () => {
    const d = (offset: number) => {
      const dt = new Date(2026, 0, 1);
      dt.setDate(dt.getDate() + offset);
      return dt;
    };
    matterFindManyMock.mockResolvedValue([
      { category: "CIVIL_COMMERCIAL", createdAt: d(20), closedAt: d(10) },
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(10) }
    ]);
    const r = await getCaseCycleAnalysis(period);
    expect(r[0].count).toBe(1);
    expect(r[0].minDays).toBe(10);
  });

  it("单条记录的中位数等于天数", async () => {
    const d = (offset: number) => {
      const dt = new Date(2026, 0, 1);
      dt.setDate(dt.getDate() + offset);
      return dt;
    };
    matterFindManyMock.mockResolvedValue([
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(15) }
    ]);
    const r = await getCaseCycleAnalysis(period);
    expect(r[0].medianDays).toBe(15);
  });

  it("三记录：奇数中位数取中间", async () => {
    const d = (offset: number) => {
      const dt = new Date(2026, 0, 1);
      dt.setDate(dt.getDate() + offset);
      return dt;
    };
    matterFindManyMock.mockResolvedValue([
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(10) },
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(20) },
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(30) }
    ]);
    const r = await getCaseCycleAnalysis(period);
    expect(r[0].medianDays).toBe(20);
  });

  it("多 category 各自统计最小值/最大值", async () => {
    const d = (offset: number) => {
      const dt = new Date(2026, 0, 1);
      dt.setDate(dt.getDate() + offset);
      return dt;
    };
    matterFindManyMock.mockResolvedValue([
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(10) },
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(50) },
      { category: "ADMINISTRATIVE", createdAt: d(0), closedAt: d(20) }
    ]);
    const r = await getCaseCycleAnalysis(period);
    const civil = r.find(x => x.category === "CIVIL_COMMERCIAL")!;
    const admin = r.find(x => x.category === "ADMINISTRATIVE")!;
    expect(civil.minDays).toBe(10);
    expect(civil.maxDays).toBe(50);
    expect(admin.minDays).toBe(20);
    expect(admin.maxDays).toBe(20);
  });

  it("民事 5 条计算 avg/median/min/max", async () => {
    const d = (offset: number) => {
      const dt = new Date(2026, 0, 1);
      dt.setDate(dt.getDate() + offset);
      return dt;
    };
    matterFindManyMock.mockResolvedValue([
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(10) }, // 10
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(20) }, // 20
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(30) }, // 30
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(40) }, // 40
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(100) } // 100
    ]);
    const r = await getCaseCycleAnalysis(period);
    expect(r).toHaveLength(1);
    expect(r[0].count).toBe(5);
    expect(r[0].avgDays).toBe(40); // (10+20+30+40+100)/5
    expect(r[0].medianDays).toBe(30); // 中间
    expect(r[0].minDays).toBe(10);
    expect(r[0].maxDays).toBe(100);
  });

  it("偶数样本：中位数取两中间均值", async () => {
    const d = (offset: number) => {
      const dt = new Date(2026, 0, 1);
      dt.setDate(dt.getDate() + offset);
      return dt;
    };
    matterFindManyMock.mockResolvedValue([
      { category: "CRIMINAL", createdAt: d(0), closedAt: d(10) },
      { category: "CRIMINAL", createdAt: d(0), closedAt: d(20) },
      { category: "CRIMINAL", createdAt: d(0), closedAt: d(30) },
      { category: "CRIMINAL", createdAt: d(0), closedAt: d(40) }
    ]);
    const r = await getCaseCycleAnalysis(period);
    expect(r[0].medianDays).toBe(25); // (20+30)/2
  });

  it("多 category 按 count 倒序", async () => {
    const d = (offset: number) => {
      const dt = new Date(2026, 0, 1);
      dt.setDate(dt.getDate() + offset);
      return dt;
    };
    matterFindManyMock.mockResolvedValue([
      { category: "ADMINISTRATIVE", createdAt: d(0), closedAt: d(5) },
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(5) },
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(5) },
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(5) }
    ]);
    const r = await getCaseCycleAnalysis(period);
    expect(r.map((x) => x.category)).toEqual(["CIVIL_COMMERCIAL", "ADMINISTRATIVE"]);
  });

  it("closedAt < createdAt 的脏数据被丢弃", async () => {
    const d = (offset: number) => {
      const dt = new Date(2026, 0, 1);
      dt.setDate(dt.getDate() + offset);
      return dt;
    };
    matterFindManyMock.mockResolvedValue([
      { category: "CIVIL_COMMERCIAL", createdAt: d(10), closedAt: d(5) }, // 脏：-5
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(10) }
    ]);
    const r = await getCaseCycleAnalysis(period);
    expect(r[0].count).toBe(1);
    expect(r[0].avgDays).toBe(10);
  });
});

describe("getReviewIssueAnalysis", () => {
  it("空 → 0 计数", async () => {
    reviewFindManyMock.mockResolvedValue([]);
    const r = await getReviewIssueAnalysis(period);
    expect(r.recordCount).toBe(0);
    expect(r.totalItems).toBe(0);
    expect(r.topIssues).toEqual([]);
    expect(r.bySeverity).toEqual({ HIGH: 0, MEDIUM: 0, LOW: 0 });
  });

  it("itemsJson 非数组时回退为空", async () => {
    reviewFindManyMock.mockResolvedValue([
      { id: "r1", documentId: "d1", itemsJson: null },
      { id: "r2", documentId: "d2", itemsJson: undefined },
      { id: "r3", documentId: "d3", itemsJson: "string" },
      { id: "r4", documentId: "d4", itemsJson: { foo: "bar" } }
    ]);
    const r = await getReviewIssueAnalysis(period);
    expect(r.recordCount).toBe(4);
    expect(r.documentCount).toBe(4);
    expect(r.totalItems).toBe(0);
  });

  it("忽略无效 severity 和 type", async () => {
    reviewFindManyMock.mockResolvedValue([
      {
        id: "r1",
        documentId: "d1",
        itemsJson: [
          { type: "RISK", severity: "CRITICAL", title: "A" },
          { type: "BUG", severity: "HIGH", title: "B" },
          { type: "MISSING", severity: "MEDIUM", title: "C" }
        ]
      }
    ]);
    const r = await getReviewIssueAnalysis(period);
    // valid: HIGH severity (B), MEDIUM severity (C); CRITICAL ignored
    expect(r.bySeverity).toEqual({ HIGH: 1, MEDIUM: 1, LOW: 0 });
    // valid: RISK type (A), MISSING type (C); BUG ignored
    expect(r.byType).toEqual({ MISSING: 1, RISK: 1, ISSUE: 0, SUGGESTION: 0 });
    expect(r.totalItems).toBe(3); // all three items counted in totalItems
  });

  it("重复同一 document 只计一次 documentCount", async () => {
    reviewFindManyMock.mockResolvedValue([
      { id: "r1", documentId: "d1", itemsJson: [{ type: "RISK", severity: "HIGH", title: "A" }] },
      { id: "r2", documentId: "d1", itemsJson: [{ type: "RISK", severity: "HIGH", title: "B" }] }
    ]);
    const r = await getReviewIssueAnalysis(period);
    expect(r.documentCount).toBe(1);
    expect(r.recordCount).toBe(2);
  });

  it("同一 title 跨 records 累加 occurrences 和 severityCounts", async () => {
    reviewFindManyMock.mockResolvedValue([
      { id: "r1", documentId: "d1", itemsJson: [{ type: "RISK", severity: "HIGH", title: "X" }] },
      { id: "r2", documentId: "d2", itemsJson: [{ type: "RISK", severity: "MEDIUM", title: "X" }] }
    ]);
    const r = await getReviewIssueAnalysis(period);
    expect(r.totalItems).toBe(2);
    expect(r.topIssues[0].title).toBe("X");
    expect(r.topIssues[0].occurrences).toBe(2);
    expect(r.topIssues[0].severityCounts).toEqual({ HIGH: 1, MEDIUM: 1, LOW: 0 });
  });

  it("大量不同 title 验证 top 10 截断", async () => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      type: "ISSUE" as const,
      severity: "LOW" as const,
      title: `issue-${i}`
    }));
    reviewFindManyMock.mockResolvedValue([
      { id: "r1", documentId: "d1", itemsJson: items }
    ]);
    const r = await getReviewIssueAnalysis(period);
    expect(r.topIssues).toHaveLength(10);
  });

  it("聚合 severity / type / topIssues", async () => {
    reviewFindManyMock.mockResolvedValue([
      {
        id: "r1",
        documentId: "d1",
        itemsJson: [
          { type: "RISK", severity: "HIGH", title: "违约责任缺失", detail: "x" },
          { type: "MISSING", severity: "MEDIUM", title: "管辖约定模糊", detail: "x" }
        ]
      },
      {
        id: "r2",
        documentId: "d2",
        itemsJson: [
          { type: "RISK", severity: "HIGH", title: "违约责任缺失", detail: "x" },
          { type: "RISK", severity: "HIGH", title: "违约责任缺失", detail: "x" },
          { type: "SUGGESTION", severity: "LOW", title: "措辞建议", detail: "x" }
        ]
      },
      {
        id: "r3",
        documentId: "d1", // 重复同一 doc
        itemsJson: [
          { type: "RISK", severity: "MEDIUM", title: "违约责任缺失", detail: "x" }
        ]
      }
    ]);
    const r = await getReviewIssueAnalysis(period);
    expect(r.recordCount).toBe(3);
    expect(r.documentCount).toBe(2); // d1, d2
    expect(r.totalItems).toBe(6);
    expect(r.bySeverity).toEqual({ HIGH: 3, MEDIUM: 2, LOW: 1 });
    expect(r.byType).toEqual({ MISSING: 1, RISK: 4, ISSUE: 0, SUGGESTION: 1 });
    expect(r.topIssues[0].title).toBe("违约责任缺失");
    expect(r.topIssues[0].occurrences).toBe(4);
    expect(r.topIssues[0].severityCounts).toEqual({ HIGH: 3, MEDIUM: 1, LOW: 0 });
  });

  it("topIssues 限 10 条", async () => {
    reviewFindManyMock.mockResolvedValue([
      {
        id: "r1",
        documentId: "d1",
        itemsJson: Array.from({ length: 15 }, (_, i) => ({
          type: "ISSUE",
          severity: "LOW",
          title: `问题${i}`,
          detail: "x"
        }))
      }
    ]);
    const r = await getReviewIssueAnalysis(period);
    expect(r.topIssues).toHaveLength(10);
  });

  it("空 title 不进 topIssues", async () => {
    reviewFindManyMock.mockResolvedValue([
      {
        id: "r1",
        documentId: "d1",
        itemsJson: [
          { type: "RISK", severity: "HIGH", title: "  ", detail: "x" },
          { type: "RISK", severity: "HIGH", title: "正常", detail: "x" }
        ]
      }
    ]);
    const r = await getReviewIssueAnalysis(period);
    expect(r.totalItems).toBe(2);
    expect(r.topIssues).toHaveLength(1);
    expect(r.topIssues[0].title).toBe("正常");
  });
});
