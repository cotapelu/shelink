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
 * v0.22: Phân tích sâu báo cáo
 *
 * - Chu kỳ xử lý vụ án: Số ngày closedAt - createdAt của các vụ án đã kết thúc trong kỳ, thống kê theo category
 * - AI review top issues: Tập hợp ReviewRecord.itemsJson trong kỳ, tìm title xuất hiện nhiều
 */
import { prisma } from "@/lib/prisma";
import type { MatterCategory } from "@prisma/client";
import type { ReportPeriod } from "./queries";
import type { ReviewItem, ReviewType, ReviewSeverity } from "@/lib/ai/review-parser";

export type CycleStats = {
  category: MatterCategory;
  count: number;
  avgDays: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
};

/**
 * Tính chu kỳ "Nhận vụ án → Kết thúc". Chỉ xét các vụ án có closedAt rơi trong kỳ.
 * Dùng JS sort để tính trung vị (prisma groupBy không hỗ trợ).
 */
export async function getCaseCycleAnalysis(period: ReportPeriod): Promise<CycleStats[]> {
  const closed = await prisma.matter.findMany({
    where: {
      closedAt: { gte: period.start, lt: period.end },
      deletedAt: null,
      createdAt: { lt: period.end } // 防御性：createdAt 应当 <= closedAt
    },
    select: { category: true, createdAt: true, closedAt: true }
  });

  // 按 category 聚合 days 数组
  const byCat = new Map<MatterCategory, number[]>();
  for (const m of closed) {
    if (!m.closedAt) continue;
    const days = Math.round((m.closedAt.getTime() - m.createdAt.getTime()) / 86400_000);
    if (days < 0) continue;
    if (!byCat.has(m.category)) byCat.set(m.category, []);
    byCat.get(m.category)!.push(days);
  }

  const out: CycleStats[] = [];
  for (const [cat, arr] of byCat) {
    arr.sort((a, b) => a - b);
    const sum = arr.reduce((s, v) => s + v, 0);
    const avg = arr.length > 0 ? sum / arr.length : 0;
    const median =
      arr.length === 0
        ? 0
        : arr.length % 2 === 1
          ? arr[(arr.length - 1) / 2]
          : (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;
    out.push({
      category: cat,
      count: arr.length,
      avgDays: Math.round(avg * 10) / 10,
      medianDays: Math.round(median * 10) / 10,
      minDays: arr[0],
      maxDays: arr[arr.length - 1]
    });
  }
  return out.sort((a, b) => b.count - a.count);
}

export type ReviewTopIssue = {
  title: string;
  type: ReviewType;
  occurrences: number;
  severityCounts: Record<ReviewSeverity, number>;
};

export type ReviewIssueAnalysis = {
  recordCount: number;
  documentCount: number;
  totalItems: number;
  bySeverity: Record<ReviewSeverity, number>;
  byType: Record<ReviewType, number>;
  topIssues: ReviewTopIssue[]; // Top 10 title xuất hiện nhiều nhất
};

/**
 * Tổng hợp跨案件 AI review trong kỳ.
 * Lấy dữ liệu từ ReviewRecord.itemsJson và tập hợp bằng JS (PG jsonb functions khó dùng với prisma).
 */
export async function getReviewIssueAnalysis(period: ReportPeriod): Promise<ReviewIssueAnalysis> {
  const records = await prisma.reviewRecord.findMany({
    where: { reviewedAt: { gte: period.start, lt: period.end } },
    select: { id: true, documentId: true, itemsJson: true }
  });

  const docSet = new Set<string>();
  const bySev: Record<ReviewSeverity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  const byType: Record<ReviewType, number> = {
    MISSING: 0,
    RISK: 0,
    ISSUE: 0,
    SUGGESTION: 0
  };
  // title → 累加
  const titleMap = new Map<
    string,
    { type: ReviewType; occurrences: number; severityCounts: Record<ReviewSeverity, number> }
  >();
  let totalItems = 0;

  for (const r of records) {
    docSet.add(r.documentId);
    const items = (Array.isArray(r.itemsJson) ? r.itemsJson : []) as ReviewItem[];
    for (const it of items) {
      totalItems++;
      if (it.severity in bySev) bySev[it.severity]++;
      if (it.type in byType) byType[it.type]++;
      const key = it.title.trim();
      if (!key) continue;
      if (!titleMap.has(key)) {
        titleMap.set(key, {
          type: it.type,
          occurrences: 0,
          severityCounts: { HIGH: 0, MEDIUM: 0, LOW: 0 }
        });
      }
      const entry = titleMap.get(key)!;
      entry.occurrences++;
      if (it.severity in entry.severityCounts) entry.severityCounts[it.severity]++;
    }
  }

  const topIssues: ReviewTopIssue[] = Array.from(titleMap.entries())
    .map(([title, v]) => ({
      title,
      type: v.type,
      occurrences: v.occurrences,
      severityCounts: v.severityCounts
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 10);

  return {
    recordCount: records.length,
    documentCount: docSet.size,
    totalItems,
    bySeverity: bySev,
    byType,
    topIssues
  };
}
