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
 * Logic phân tích nội dung trả về từ kiểm tra văn bản AI (hàm thuần, dễ viết test)
 * Lời gọi thực tế đi qua src/server/ai/review-document.ts
 */
import { extractJson } from "./client";

export type ReviewType = "MISSING" | "RISK" | "ISSUE" | "SUGGESTION";
export type ReviewSeverity = "HIGH" | "MEDIUM" | "LOW";

export type ReviewItem = {
  type: ReviewType;
  severity: ReviewSeverity;
  title: string;
  detail: string;
};

const VALID_TYPES: ReadonlySet<ReviewType> = new Set([
  "MISSING",
  "RISK",
  "ISSUE",
  "SUGGESTION"
]);
const VALID_SEV: ReadonlySet<ReviewSeverity> = new Set(["HIGH", "MEDIUM", "LOW"]);
const SEV_ORDER: Record<ReviewSeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/**
 * Phân tích văn bản AI trả về thành mảng ReviewItem chuẩn hoá.
 * - Phân tích JSON thất bại thì ném lỗi (bên gọi quyết định xử lý)
 * - type/severity không hợp lệ thì hạ về ISSUE/MEDIUM
 * - Bỏ qua mục có title hoặc detail rỗng
 * - Sắp theo severity HIGH→LOW
 */
export function parseReviewItems(content: string): ReviewItem[] {
  const parsed = extractJson<unknown>(content);
  if (!Array.isArray(parsed)) {
    throw new Error("Không phân tích được nội dung AI trả về thành danh sách kiểm tra");
  }
  const items: ReviewItem[] = [];
  for (const raw of parsed as Array<Record<string, unknown>>) {
    const type = typeof raw.type === "string" ? (raw.type.toUpperCase() as ReviewType) : "ISSUE";
    const severity =
      typeof raw.severity === "string"
        ? (raw.severity.toUpperCase() as ReviewSeverity)
        : "MEDIUM";
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    const detail = typeof raw.detail === "string" ? raw.detail.trim() : "";
    if (!title || !detail) continue;
    items.push({
      type: VALID_TYPES.has(type) ? type : "ISSUE",
      severity: VALID_SEV.has(severity) ? severity : "MEDIUM",
      title,
      detail
    });
  }
  items.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  return items;
}
