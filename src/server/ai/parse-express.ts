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
 * v0.27: 快递单号 OCR
 *
 * 律师上传快递单照片 → aiVision 提取快递单号 + 公司名（如能识别）
 * 失败时返回空，让律师手动输入
 */
import { requireSession } from "@/lib/auth/session";
import { aiVision, extractJson, AiNotConfiguredError } from "@/lib/ai/client";

export type ParsedExpressLabel = {
  trackingNo: string | null;
  companyCode: string | null; // 中文公司名（顺丰速运 / 中通快递 等）
};

const SUPPORTED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

const PROMPT = `下方图片是一张快递面单 / 快递单照片。请严格返回 JSON：
{"trackingNo": "单号", "companyCode": "中文快递公司名（如：顺丰速运 / 中通快递 / 京东快递）"}
规则：
- trackingNo 是面单上最显眼的运单号，10-30 位字母数字组合
- 找不到任何一项返回 null，不要编造
- 仅 JSON，不要解释`;

export async function parseExpressLabel(form: FormData): Promise<ParsedExpressLabel> {
  await requireSession();
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("缺少文件");
  if (!SUPPORTED.has(file.type)) {
    throw new Error(`仅支持图片格式（JPG/PNG/WebP），当前 ${file.type || "未知"}`);
  }
  if (file.size > 10 * 1024 * 1024) throw new Error("文件超过 10MB");

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
    throw new Error(err instanceof Error ? err.message : "快递单识别失败");
  }
}
