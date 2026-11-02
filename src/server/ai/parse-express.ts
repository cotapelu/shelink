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
 * v0.27: OCR mã vận đơn chuyển phát
 *
 * Luật sư tải ảnh phiếu gửi → aiVision trích mã vận đơn + tên hãng (nếu nhận diện được)
 * Thất bại thì trả về rỗng, để luật sư nhập thủ công
 */
import { requireSession } from "@/lib/auth/session";
import { aiVision, extractJson, AiNotConfiguredError } from "@/lib/ai/client";

export type ParsedExpressLabel = {
  trackingNo: string | null;
  companyCode: string | null; // Tên hãng tiếng Trung — GIỮ NGUYÊN: key khớp lib/express/companies.ts (hợp đồng API 快递100)
};

const SUPPORTED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

const PROMPT = `Ảnh dưới đây là một phiếu gửi / ảnh vận đơn chuyển phát. Hãy trả về JSON nghiêm ngặt:
{"trackingNo": "Số vận đơn", "companyCode": "Tên hãng chuyển phát tiếng Trung (vd: 顺丰速运 / 中通快递 / 京东快递)"}
Quy tắc:
- trackingNo là mã vận đơn nổi bật nhất trên phiếu, tổ hợp chữ-số 10-30 ký tự
- Không tìm thấy mục nào thì trả về null, không được bịa
- companyCode giữ tên hãng tiếng Trung (hợp đồng API bên ngoài, không dịch)
- Chỉ JSON, không giải thích`;

export async function parseExpressLabel(form: FormData): Promise<ParsedExpressLabel> {
  await requireSession();
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("Thiếu tệp");
  if (!SUPPORTED.has(file.type)) {
    throw new Error(`Chỉ hỗ trợ định dạng ảnh (JPG/PNG/WebP), hiện ${file.type || "không rõ"}`);
  }
  if (file.size > 10 * 1024 * 1024) throw new Error("Tệp vượt quá 10MB");

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;

  try {
    const { content } = await aiVision({
      image: { dataUrl },
      prompt: PROMPT,
      maxTokens: 300
    });
    const parsed = extractJson<ParsedExpressLabel>(content);
    return {
      trackingNo: parsed?.trackingNo?.trim() || null,
      companyCode: parsed?.companyCode?.trim() || null
    };
  } catch (err) {
    if (err instanceof AiNotConfiguredError) throw err;
    throw new Error(err instanceof Error ? err.message : "Nhận diện vận đơn thất bại");
  }
}
