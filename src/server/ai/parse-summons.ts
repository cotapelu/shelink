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
 * v0.44: 法院传票 OCR
 *
 * 律师上传传票图片 → aiVision 提取开庭日期、时间、法庭、案号、法官、当事人
 * 失败时返回 null 字段，让律师手动填写
 */
import { requireSession } from "@/lib/auth/session";
import { aiVision, extractJson, AiNotConfiguredError } from "@/lib/ai/client";

export type ParsedSummons = {
  hearingDate: string | null;   // YYYY-MM-DD
  hearingTime: string | null;   // HH:mm
  courtRoom: string | null;     // 法庭（如：第三法庭）
  caseNumber: string | null;    // 案号（如：(2024)京0105民初1234号）
  judge: string | null;         // 法官姓名
  parties: string[] | null;     // 当事人列表
};

const SUPPORTED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);

const PROMPT = `下方图片是一张中国法院传票（开庭传票）。请严格返回 JSON：
{
  "hearingDate": "开庭日期（YYYY-MM-DD）",
  "hearingTime": "开庭时间（HH:mm，24小时制）",
  "courtRoom": "开庭地点/法庭（如：本院第三法庭）",
  "caseNumber": "案号（如：(2024)京0105民初1234号）",
  "judge": "审判员/法官姓名",
  "parties": ["原告/上诉人名称", "被告/被上诉人名称"]
}
规则：
- 严格按照传票上的内容提取，不确定的字段返回 null
- hearingDate 格式必须为 YYYY-MM-DD，如原始日期为"二〇二四年六月十五日"则转为 2024-06-15
- hearingTime 格式为 HH:mm，如"上午九时三十分"转为 09:30
- parties 为数组，包含传票上列明的当事人
- 仅 JSON，不要解释`;

export async function parseSummons(form: FormData): Promise<ParsedSummons> {
  await requireSession();
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("缺少文件");
  if (!SUPPORTED.has(file.type)) {
    throw new Error(`仅支持图片（JPG/PNG）格式，当前 ${file.type || "未知"}`);
  }
  if (file.size > 10 * 1024 * 1024) throw new Error("文件超过 10MB");

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
    throw new Error(err instanceof Error ? err.message : "传票识别失败");
  }
}
