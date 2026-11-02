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
 * v0.44: OCR giấy triệu tập toà án
 *
 * Luật sư tải ảnh giấy triệu tập → aiVision trích ngày mở phiên, giờ, phòng xét xử, số án, thẩm phán, các bên
 * Khi thất bại trả về các trường null, để luật sư điền thủ công
 */
import { requireSession } from "@/lib/auth/session";
import { aiVision, extractJson, AiNotConfiguredError } from "@/lib/ai/client";

export type ParsedSummons = {
  hearingDate: string | null;   // YYYY-MM-DD
  hearingTime: string | null;   // HH:mm
  courtRoom: string | null;     // Phòng xét xử (vd: Phòng xét xử số 3)
  caseNumber: string | null;    // Số án (vd: 01/2024/TLAT)
  judge: string | null;         // Tên thẩm phán
  parties: string[] | null;     // Danh sách các bên
};

const SUPPORTED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);

const PROMPT = `Ảnh dưới đây là một giấy triệu tập toà án (giấy triệu tập mở phiên). Hãy trả về JSON nghiêm ngặt:
{
  "hearingDate": "Ngày mở phiên (YYYY-MM-DD)",
  "hearingTime": "Giờ mở phiên (HH:mm, hệ 24 giờ)",
  "courtRoom": "Địa điểm mở phiên / phòng xét xử (vd: Phòng xét xử số 3 của Toà)",
  "caseNumber": "Số án (vd: 01/2024/TLAT)",
  "judge": "Tên thẩm phán / chủ toà",
  "parties": ["Tên nguyên đơn/người kháng cáo", "Tên bị đơn/bị kháng cáo"]
}
Quy tắc:
- Trích chính xác theo nội dung trên giấy triệu tập, trường không chắc chắn trả về null
- hearingDate bắt buộc định dạng YYYY-MM-DD, nếu ngày gốc dạng chữ thì đổi sang 2024-06-15
- hearingTime định dạng HH:mm, nếu gốc dạng "09 giờ 30 phút" thì đổi sang 09:30
- parties là mảng, gồm các bên ghi trên giấy triệu tập
- Chỉ JSON, không giải thích`;

export async function parseSummons(form: FormData): Promise<ParsedSummons> {
  await requireSession();
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("Thiếu tệp");
  if (!SUPPORTED.has(file.type)) {
    throw new Error(`Chỉ hỗ trợ định dạng ảnh (JPG/PNG), hiện ${file.type || "không rõ"}`);
  }
  if (file.size > 10 * 1024 * 1024) throw new Error("Tệp vượt quá 10MB");

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;

  try {
    const { content } = await aiVision({
      image: { dataUrl },
      prompt: PROMPT,
      maxTokens: 500
    });
    const parsed = extractJson<ParsedSummons>(content);
    return {
      hearingDate: parsed?.hearingDate?.trim() || null,
      hearingTime: parsed?.hearingTime?.trim() || null,
      courtRoom: parsed?.courtRoom?.trim() || null,
      caseNumber: parsed?.caseNumber?.trim() || null,
      judge: parsed?.judge?.trim() || null,
      parties: Array.isArray(parsed?.parties) ? parsed.parties.filter(Boolean) : null
    };
  } catch (err) {
    if (err instanceof AiNotConfiguredError) throw err;
    throw new Error(err instanceof Error ? err.message : "Nhận diện giấy triệu tập thất bại");
  }
}
