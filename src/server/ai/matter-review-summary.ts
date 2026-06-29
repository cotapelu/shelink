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
/**
 * v0.22: 案件级 AI 审查总览（聚合本案全部 ReviewRecord）
 *
 * read-only，无 "use server"，server component 直接调用。
 */
import { prisma } from "@/lib/prisma";
import type {
  ReviewItem,
  ReviewSeverity,
  ReviewType
} from "@/lib/ai/review-parser";

export type MatterReviewTopItem = {
  title: string;
  type: ReviewType;
  severity: ReviewSeverity;
  detail: string;
  documentId: string;
  documentName: string;
  reviewedAt: Date;
};

export type MatterReviewSummary = {
  recordCount: number;
  documentCount: number;
  totalItems: number;
  bySeverity: Record<ReviewSeverity, number>;
  topHighItems: MatterReviewTopItem[]; // 最多 3 条
  latestReviewedAt: Date | null;
};

export async function getMatterReviewSummary(
  matterId: string
): Promise<MatterReviewSummary> {
  const records = await prisma.reviewRecord.findMany({
    where: { matterId },
    orderBy: { reviewedAt: "desc" },
    select: {
      id: true,
      reviewedAt: true,
      documentId: true,
      itemsJson: true,
      document: { select: { name: true } }
    }
  });

  const docSet = new Set<string>();
  const bySeverity: Record<ReviewSeverity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  let totalItems = 0;
  // 收集所有 HIGH，按 reviewedAt 倒序（records 已倒序），取最近 3 条不重复 title
  const seenTitles = new Set<string>();
  const topHigh: MatterReviewTopItem[] = [];
  let latest: Date | null = null;

  for (const r of records) {
    if (!latest) latest = r.reviewedAt;
    docSet.add(r.documentId);
    const items = (Array.isArray(r.itemsJson) ? r.itemsJson : []) as ReviewItem[];
    for (const it of items) {
      totalItems++;
      if (it.severity in bySeverity) bySeverity[it.severity]++;
      if (it.severity === "HIGH" && topHigh.length < 3) {
        const key = it.title.trim();
        if (key && !seenTitles.has(key)) {
          seenTitles.add(key);
          topHigh.push({
            title: it.title,
            type: it.type,
            severity: it.severity,
            detail: it.detail,
            documentId: r.documentId,
            documentName: r.document.name,
            reviewedAt: r.reviewedAt
          });
        }
      }
    }
  }

  return {
    recordCount: records.length,
    documentCount: docSet.size,
    totalItems,
    bySeverity,
    topHighItems: topHigh,
    latestReviewedAt: latest
  };
}
