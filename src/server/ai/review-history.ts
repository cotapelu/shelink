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
"use server";

/**
 * v0.21: 文书 AI 审查历史查询
 */
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { assertCanAccessMatter } from "@/lib/permissions";
import type {
  ReviewItem,
  ReviewSeverity,
  ReviewType
} from "@/lib/ai/review-parser";

export type ReviewHistoryEntry = {
  id: string;
  reviewedAt: Date;
  reviewedBy: { id: string; name: string };
  itemCount: number;
  truncated: boolean;
  textPreviewChars: number;
  /** 按 severity 统计：{ HIGH: 2, MEDIUM: 3, LOW: 0 } */
  severityCounts: Record<ReviewSeverity, number>;
};

export async function listReviewHistory(input: {
  documentId: string;
}): Promise<ReviewHistoryEntry[]> {
  const session = await requireSession();

  const doc = await prisma.document.findFirst({
    where: { id: input.documentId, deletedAt: null },
    select: { id: true, matterId: true }
  });
  if (!doc) return [];
  if (doc.matterId) {
    await assertCanAccessMatter(session.user.id, session.user.role, doc.matterId);
  }

  const list = await prisma.reviewRecord.findMany({
    where: { documentId: doc.id },
    orderBy: { reviewedAt: "desc" },
    select: {
      id: true,
      reviewedAt: true,
      itemCount: true,
      truncated: true,
      textPreviewChars: true,
      itemsJson: true,
      reviewedBy: { select: { id: true, name: true } }
    }
  });

  return list.map((r) => {
    const items = (Array.isArray(r.itemsJson) ? r.itemsJson : []) as ReviewItem[];
    const sev: Record<ReviewSeverity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const it of items) {
      if (it.severity in sev) sev[it.severity]++;
    }
    return {
      id: r.id,
      reviewedAt: r.reviewedAt,
      reviewedBy: r.reviewedBy,
      itemCount: r.itemCount,
      truncated: r.truncated,
      textPreviewChars: r.textPreviewChars,
      severityCounts: sev
    };
  });
}

export async function getReviewRecord(input: {
  recordId: string;
}): Promise<{
  id: string;
  reviewedAt: Date;
  reviewedBy: { id: string; name: string };
  documentName: string;
  textPreviewChars: number;
  truncated: boolean;
  items: ReviewItem[];
} | null> {
  const session = await requireSession();
  const rec = await prisma.reviewRecord.findUnique({
    where: { id: input.recordId },
    select: {
      id: true,
      reviewedAt: true,
      itemsJson: true,
      textPreviewChars: true,
      truncated: true,
      matterId: true,
      reviewedBy: { select: { id: true, name: true } },
      document: { select: { name: true } }
    }
  });
  if (!rec) return null;
  await assertCanAccessMatter(session.user.id, session.user.role, rec.matterId);
  return {
    id: rec.id,
    reviewedAt: rec.reviewedAt,
    reviewedBy: rec.reviewedBy,
    documentName: rec.document.name,
    textPreviewChars: rec.textPreviewChars,
    truncated: rec.truncated,
    items: (Array.isArray(rec.itemsJson) ? rec.itemsJson : []) as ReviewItem[]
  };
}
