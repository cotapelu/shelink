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
 * v0.28: Soạn thảo văn bản bằng AI theo hướng dẫn (đối chiếu mẫu "điền chỗ trống" của 案件云)
 *
 * Người dùng cung cấp ở frontend dạng "điền chỗ trống": loại văn bản + phía ta / phía đối phương + bối cảnh vụ án + yêu cầu khởi kiện,
 * ở đây ghép thành gợi ý có cấu trúc đưa cho aiChat, trả về bản nháp Markdown để frontend xem trước / copy / tải.
 *
 * Nguyên tắc: chỉ soạn dựa trên thông tin người dùng cung cấp, không bịa sự việc, chứng cứ và số điều luật cụ thể;
 * chỗ thiếu thông tin dùng【】làm chỗ giữ chỗ và nhắc bổ sung. Kết quả sinh ra chỉ là bản nháp, cần luật sư hiệu đính.
 */
import { requireSession } from "@/lib/auth/session";
import { aiChat, AiNotConfiguredError } from "@/lib/ai/client";

export type DraftInput = {
  docType: string; // Loại văn bản, vd "Đơn khởi kiện dân sự"
  selfParty?: string; // Bên phía ta
  opposingParty?: string; // Bên phía đối phương
  background?: string; // Bối cảnh vụ án
  claims?: string; // Yêu cầu khởi kiện / luận điểm cốt lõi
  extra?: string; // Bổ sung khác
};

export type DraftResult =
  | { ok: true; content: string }
  | { ok: false; reason: "not_configured" | "error"; message: string };

const SYSTEM_PROMPT = `Bạn là luật sư đang hành nghề giàu kinh nghiệm, giỏi soạn mọi loại văn bản pháp lý.
Dựa trên thông tin người dùng cung cấp, hãy soạn một bản nháp văn bản pháp lý có cấu trúc chuẩn, từ ngữ chuyên nghiệp, xuất dạng Markdown.
Yêu cầu:
1. Tuân thủ nghiêm ngặt định dạng chung của loại văn bản đó (mục thông tin các bên, thân bài, yêu cầu khởi kiện / luận điểm và căn cứ, chữ ký...).
2. Chỉ viết dựa trên thông tin người dùng cung cấp, không được bịa thông tin danh tính các bên, chứng cứ, số tiền hoặc số điều luật cụ thể; chỗ thiếu thông tin dùng【】làm chỗ giữ chỗ và nhắc bổ sung.
3. Ngôn ngữ trang trọng, logic rõ ràng, trình bày luận điểm và căn cứ theo từng điểm.
4. Cuối văn bản ghi rõ đây là bản nháp do AI sinh ra, cần luật sư hiệu đính trước khi dùng.`;

export async function draftDocument(input: DraftInput): Promise<DraftResult> {
  await requireSession();

  const docType = input.docType?.trim();
  if (!docType) {
    return { ok: false, reason: "error", message: "Hãy chọn hoặc điền loại văn bản trước" };
  }

  const lines = [`Hãy soạn một "${docType}".`];
  if (input.selfParty?.trim()) lines.push(`Bên phía ta: ${input.selfParty.trim()}`);
  if (input.opposingParty?.trim()) lines.push(`Bên phía đối phương: ${input.opposingParty.trim()}`);
  if (input.background?.trim()) lines.push(`Bối cảnh vụ án:\n${input.background.trim()}`);
  if (input.claims?.trim()) lines.push(`Yêu cầu khởi kiện / luận điểm cốt lõi:\n${input.claims.trim()}`);
  if (input.extra?.trim()) lines.push(`Bổ sung khác:\n${input.extra.trim()}`);

  try {
    const { content } = await aiChat({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: lines.join("\n\n") }
      ],
      maxTokens: 2800,
      temperature: 0.4
    });
    return { ok: true, content };
  } catch (err) {
    if (err instanceof AiNotConfiguredError) {
      return { ok: false, reason: "not_configured", message: err.message };
    }
    return {
      ok: false,
      reason: "error",
      message: err instanceof Error ? err.message : "Sinh thất bại, hãy thử lại sau"
    };
  }
}
