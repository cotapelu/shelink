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
"use server";

/**
 * v0.19: Gợi ý nguyên nhân bằng AI
 *
 * Nhập mô tả tình hình → LLM trả về 3 tên nguyên nhân cấp 4 + lý do gợi ý + độ tin cậy
 * → dùng searchCauses tra ngược id trong kho (không tìm thấy thì bỏ)
 * → trả về danh sách ứng viên kèm object cause trong kho
 * LƯU Ý: tên nguyên nhân trong DB đang là tiếng Trung (cụm seed prisma/seeds/causes-*) nên prompt
 * vẫn yêu cầu model trả về tên案由 (nguyên nhân) tiếng Trung để khớp chính xác — xem glossary, chờ duyệt cùng cụm seed.
 */
import type { MatterCategory } from "@prisma/client";
import { aiChat, extractJson, AiNotConfiguredError } from "@/lib/ai/client";
import { searchCauses, type CauseSearchResult } from "@/server/causes/actions";
import { requireSession } from "@/lib/auth/session";

export type CauseConfidence = "HIGH" | "MEDIUM" | "LOW";

export type CauseRecommendation = {
  cause: CauseSearchResult;
  reason: string;
  confidence: CauseConfidence;
};

type LlmCandidate = {
  name?: unknown;
  reason?: unknown;
  confidence?: unknown;
};

const SYSTEM_PROMPT = `Bạn là trợ lý phân loại案由 (nguyên nhân) pháp luật.
Dựa trên loại vụ án và mô tả tình hình người dùng đưa ra, từ hệ thống《Quy định về案由 các vụ án dân sự》/《Quy định về案由 các vụ án hành chính》/ hệ thống tội danh hình sự,
chọn ra 3案由**cấp cuối** (cấp 3 hoặc cấp 4) khớp nhất.

Trả về nghiêm ngặt theo mảng JSON dưới đây (chỉ JSON, không kèm chữ giải thích):
[
  {"name": "Tên案由 (nguyên nhân) đầy đủ (vd: 民间借贷纠纷)", "reason": "Vì sao khớp với vụ này, trong 30 chữ", "confidence": "HIGH" | "MEDIUM" | "LOW"},
  ...
]

Quy tắc:
- Bắt buộc trả về 3 mục; sắp theo mức độ liên quan giảm dần
- Tên案由 phải dùng tên chuẩn đầy đủ (vd「民间借贷纠纷」chứ không phải「借贷」「借贷纠纷」) — ví dụ là dữ liệu案由 DB đang có
- Ưu tiên chọn nguyên nhân cụ thể cấp cuối, tránh phân loại chung chung cấp 2 như「合同纠纷」
- confidence tự đánh giá: HIGH=các yếu tố tình hình tương ứng hoàn toàn; MEDIUM=yếu tố chính khớp nhưng còn mơ hồ; LOW=thông tin không đủ chỉ đoán được`;

function categoryHint(category: MatterCategory): string {
  switch (category) {
    case "CIVIL_COMMERCIAL":
      return "Dân sự - Thương mại";
    case "CRIMINAL":
      return "Hình sự";
    case "ADMINISTRATIVE":
      return "Hành chính";
    case "NON_LITIGATION":
      return "Phi tố tụng";
    case "LEGAL_COUNSEL":
      return "Tư vấn thường xuyên";
    case "SPECIAL_PROJECT":
      return "Đặc biệt";
    default:
      return category;
  }
}

function normalizeConfidence(v: unknown): CauseConfidence {
  const s = typeof v === "string" ? v.toUpperCase() : "";
  if (s === "HIGH" || s === "MEDIUM" || s === "LOW") return s;
  return "MEDIUM";
}

/**
 * Tra ngược: map tên案由 (nguyên nhân) LLM đưa ra sang bản ghi trong kho.
 * - Ưu tiên khớp chính xác name
 * - Nếu không thì lấy mục đầu tiên searchCauses trả về
 * - Lọc bỏ level < 3 (cấp 2 quá chung chung, thà không gợi ý)
 */
async function resolveCauseId(
  category: MatterCategory,
  rawName: string
): Promise<CauseSearchResult | null> {
  const name = rawName.trim();
  if (!name) return null;
  const hits = await searchCauses({ category, query: name, limit: 10 });
  if (hits.length === 0) return null;
  const exact = hits.find((h) => h.name === name && h.level >= 3);
  if (exact) return exact;
  const leaf = hits.find((h) => h.level >= 3);
  return leaf ?? null;
}

export async function recommendCause(input: {
  category: MatterCategory;
  situation: string;
}): Promise<CauseRecommendation[]> {
  await requireSession();

  const situation = input.situation.trim();
  if (situation.length < 5) {
    throw new Error("Mô tả tình hình quá ngắn, cần ít nhất 5 chữ");
  }

  let content = "";
  try {
    const res = await aiChat({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Loại vụ án: ${categoryHint(input.category)}\n\nTình hình:\n${situation.slice(0, 4000)}`
        }
      ],
      maxTokens: 800,
      temperature: 0.1
    });
    content = res.content;
  } catch (err) {
    if (err instanceof AiNotConfiguredError) throw err;
    throw new Error(err instanceof Error ? err.message : "Yêu cầu AI thất bại");
  }

  const parsed = extractJson<LlmCandidate[]>(content);
  if (!Array.isArray(parsed)) {
    throw new Error("Không phân tích được nội dung AI trả về thành danh sách ứng viên");
  }

  const results: CauseRecommendation[] = [];
  for (const item of parsed.slice(0, 5)) {
    const name = typeof item.name === "string" ? item.name : "";
    const reason = typeof item.reason === "string" ? item.reason : "";
    const confidence = normalizeConfidence(item.confidence);
    const cause = await resolveCauseId(input.category, name);
    if (!cause) continue;
    if (results.some((r) => r.cause.id === cause.id)) continue;
    results.push({ cause, reason, confidence });
    if (results.length >= 3) break;
  }

  if (results.length === 0) {
    throw new Error("Nguyên nhân AI gợi ý không có trong danh mục案由, hãy chọn thủ công");
  }

  return results;
}
