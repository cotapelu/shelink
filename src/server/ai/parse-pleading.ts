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
 * v0.11: Khung OCR đơn khởi kiện / đơn yêu cầu (v0.27 mở rộng: hỗ trợ PDF bản scan)
 *
 * Hỗ trợ ảnh (jpg/png/webp) và PDF.
 * - Ảnh đi qua nhận diện thị giác aiVision
 * - PDF ưu tiên trích văn bản unpdf + aiChat (chi phí thấp, nhanh)
 * - Khi lớp văn bản PDF rỗng (bản scan) thì fallback: unpdf renderPageAsImage render 3 trang đầu → aiVision từng trang → gộp kết quả
 */
import { requireSession } from "@/lib/auth/session";
import { aiChat, aiVision, extractJson, AiNotConfiguredError } from "@/lib/ai/client";
import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";

export type PleadingPartyHint = {
  name: string;
  idNumber?: string;
  address?: string;
  legalRep?: string;
  phone?: string;
};

export type ParsedPleading = {
  plaintiffs: PleadingPartyHint[]; // Bên khởi kiện/bên yêu cầu
  thirdParties: PleadingPartyHint[]; // Người thứ ba
  cause?: string;
  claimAmount?: number;
  claimDescription?: string;
  court?: string;
};

const SUPPORTED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];
const SUPPORTED_PDF_MIME = ["application/pdf"];

const SYSTEM_PROMPT = `Bạn là trợ lý phân tích văn bản pháp lý. Ảnh dưới đây là một đơn khởi kiện / đơn yêu cầu / đơn yêu cầu trọng tài.
Hãy trả về nghiêm ngặt theo mẫu JSON sau (chỉ JSON, không giải thích):
{
  "plaintiffs": [{"name": "Họ tên đầy đủ", "idNumber": "Số giấy tờ hoặc mã số thuế (tuỳ chọn)", "address": "tuỳ chọn", "legalRep": "Người đại diện theo pháp luật (áp dụng công ty, tuỳ chọn)", "phone": "tuỳ chọn"}],
  "thirdParties": [{"name": "Họ tên đầy đủ", "idNumber": "tuỳ chọn", "address": "tuỳ chọn"}],
  "cause": "Nguyên nhân (vd: tranh chấp hợp đồng mua bán)",
  "claimAmount": số (VNĐ, chỉ khi là giá trị tiền; không phải tiền thì điền null),
  "claimDescription": "Luận điểm yêu cầu khởi kiện / nội dung yêu cầu",
  "court": "Tên đầy đủ toà án / cơ quan trọng tài có thẩm quyền"
}
Quy tắc:
- Trường không tìm thấy trả về mảng rỗng [] hoặc null, không được bịa
- Bên khởi kiện gồm nguyên đơn / người yêu cầu / người yêu cầu thi hành / người kháng cáo, đều để vào plaintiffs
- Không trả về bị đơn / người bị yêu cầu / bị kháng cáo (đó là người dùng)
- Đơn vị tiền thống nhất là VNĐ`;

function normalizeResult(parsed: Partial<ParsedPleading> | null | undefined): ParsedPleading {
  if (!parsed) throw new Error("Không phân tích được kết quả AI trả về thành JSON");
  return {
    plaintiffs: Array.isArray(parsed.plaintiffs) ? parsed.plaintiffs : [],
    thirdParties: Array.isArray(parsed.thirdParties) ? parsed.thirdParties : [],
    cause: parsed.cause ?? undefined,
    claimAmount: typeof parsed.claimAmount === "number" ? parsed.claimAmount : undefined,
    claimDescription: parsed.claimDescription ?? undefined,
    court: parsed.court ?? undefined
  };
}

// Gộp kết quả scan nhiều trang: danh sách các bên khử trùng theo name, trường vô hướng lấy giá trị không rỗng đầu tiên
function mergeResults(results: ParsedPleading[]): ParsedPleading {
  const seen = new Set<string>();
  const dedupe = (list: PleadingPartyHint[]) => {
    const out: PleadingPartyHint[] = [];
    for (const p of list) {
      const key = p.name?.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  };
  return {
    plaintiffs: dedupe(results.flatMap((r) => r.plaintiffs)),
    thirdParties: dedupe(results.flatMap((r) => r.thirdParties)),
    cause: results.find((r) => r.cause)?.cause,
    claimAmount: results.find((r) => typeof r.claimAmount === "number")?.claimAmount,
    claimDescription: results.find((r) => r.claimDescription)?.claimDescription,
    court: results.find((r) => r.court)?.court
  };
}

export async function parsePleading(form: FormData): Promise<ParsedPleading> {
  await requireSession();
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("Thiếu tệp");

  const isImage = SUPPORTED_IMAGE_MIME.includes(file.type);
  const isPdf = SUPPORTED_PDF_MIME.includes(file.type);
  if (!isImage && !isPdf) {
    throw new Error(`Chỉ hỗ trợ JPG / PNG / WebP / PDF, hiện ${file.type || "không rõ"}`);
  }
  if (file.size > 20 * 1024 * 1024) throw new Error("Tệp vượt quá 20MB");

  const buf = Buffer.from(await file.arrayBuffer());

  try {
    if (isImage) {
      const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;
      const { content } = await aiVision({
        image: { dataUrl },
        prompt: SYSTEM_PROMPT,
        maxTokens: 1500
      });
      return normalizeResult(extractJson<ParsedPleading>(content));
    }

    // PDF: thử trích lớp văn bản trước (chi phí thấp)
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    const cleaned = (Array.isArray(text) ? text.join("\n") : text).trim();

    if (cleaned && cleaned.length >= 20) {
      const { content } = await aiChat({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Dưới đây là toàn văn đơn khởi kiện / đơn yêu cầu:\n\n${cleaned.slice(0, 12000)}` }
        ],
        maxTokens: 1500
      });
      return normalizeResult(extractJson<ParsedPleading>(content));
    }

    // v0.27: lớp văn bản rỗng (PDF scan) → render 3 trang đầu ra PNG, nhận diện vision từng trang rồi gộp
    const totalPages = pdf.numPages;
    const pagesToRender = Math.min(totalPages, 3);
    const canvasImport = () => import("@napi-rs/canvas") as Promise<any>;
    const pageResults: ParsedPleading[] = [];

    for (let i = 1; i <= pagesToRender; i++) {
      const arrayBuf = await renderPageAsImage(new Uint8Array(buf), i, {
        canvasImport,
        scale: 2.0
      });
      const dataUrl = `data:image/png;base64,${Buffer.from(arrayBuf).toString("base64")}`;
      const { content } = await aiVision({
        image: { dataUrl },
        prompt: `${SYSTEM_PROMPT}\n\n(Đây là trang ${i}/${pagesToRender} của bản scan đơn khởi kiện / đơn yêu cầu)`,
        maxTokens: 1500
      });
      const parsed = extractJson<ParsedPleading>(content);
      if (parsed) pageResults.push(normalizeResult(parsed));
    }

    if (pageResults.length === 0) {
      throw new Error("Nhận diện PDF bản scan thất bại, hãy gửi ảnh hoặc kiểm tra tệp");
    }
    return mergeResults(pageResults);
  } catch (err) {
    if (err instanceof AiNotConfiguredError) throw err;
    throw new Error(err instanceof Error ? err.message : "Nhận diện OCR thất bại");
  }
}
