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

import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { aiVision, extractJson, AiNotConfiguredError } from "@/lib/ai/client";

const MAX_IMAGE_SIZE = 6 * 1024 * 1024; // 6MB

export interface RecognizedInvoice {
  invoiceType?: string;
  invoiceCode?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  sellerName?: string;
  sellerTaxId?: string;
  buyerName?: string;
  buyerTaxId?: string;
  totalAmount?: number;
  taxAmount?: number;
  totalWithTax?: number;
  items?: { name: string; amount: number; taxRate?: string }[];
  checkCode?: string;
  remark?: string;
}

const PROMPT = `Hãy nhận diện thông tin trong ảnh hóa đơn GTGT Việt Nam này, xuất JSON:

{
  "invoiceType": "Loại hóa đơn (vd: hóa đơn GTGT, hóa đơn thường, hóa đơn điện tử)",
  "invoiceCode": "Mã số hóa đơn (nếu có)",
  "invoiceNumber": "Số hóa đơn (8 hoặc 20 chữ số)",
  "invoiceDate": "Ngày lập hóa đơn YYYY-MM-DD",
  "sellerName": "Tên bên bán",
  "sellerTaxId": "Mã số thuế bên bán",
  "buyerName": "Tên bên mua",
  "buyerTaxId": "Mã số thuế bên mua",
  "totalAmount": "Tổng tiền (số)",
  "taxAmount": "Tiền thuế (số)",
  "totalWithTax": "Tổng cộng tiền thuế (số)",
  "items": [{"name": "Tên hàng mục", "amount": số tiền, "taxRate": "chuỗi thuế suất"}],
  "checkCode": "Mã kiểm tra (6 chữ số cuối)",
  "remark": "Ghi chú"
}

Chỉ trả lời JSON, không thêm chữ khác. Trường không nhận diện được thì để chuỗi rỗng hoặc bỏ qua.`;

export async function recognizeInvoiceFromImage(formData: FormData): Promise<
  | { ok: true; data: RecognizedInvoice; raw: string }
  | { ok: false; message: string }
> {
  const session = await requireSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Hãy tải lên ảnh hóa đơn" };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { ok: false, message: `Ảnh vượt quá ${MAX_IMAGE_SIZE / 1024 / 1024}MB` };
  }
  // v0.11: PDF cũng cho tải lên, nhưng kết quả nhận diện phụ thuộc model vision có hỗ trợ PDF gốc không
  // Nếu model không đọc được PDF, aiVision sẽ thất bại và trả lỗi rõ ràng
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";
  if (!isImage && !isPdf) {
    return { ok: false, message: "Chỉ hỗ trợ ảnh hoặc PDF" };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;

  try {
    const res = await aiVision({
      image: { dataUrl },
      prompt: PROMPT,
      timeoutMs: 30_000
    });

    const data = extractJson<RecognizedInvoice>(res.content) ?? {};

    await audit({
      userId: session.user.id,
      action: "AI_INVOICE_OCR",
      targetType: "FeeEntry",
      targetId: "scratch",
      detail: {
        ok: true,
        fileName: file.name,
        size: file.size,
        invoiceNumber: data.invoiceNumber ?? null
      }
    });

    return { ok: true, data, raw: res.content };
  } catch (e) {
    if (e instanceof AiNotConfiguredError) {
      return { ok: false, message: e.message };
    }
    return { ok: false, message: e instanceof Error ? e.message : "Nhận diện thất bại" };
  }
}
