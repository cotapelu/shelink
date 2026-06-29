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
/**
 * v0.9.1 短信 AI 增强（server-only）
 *
 * 抽 enrichWithAi 出来单独成文件，避免 client 组件 import sms-parser
 * 时把 ai/client → ai/settings → storage/crypto → node:crypto 拉到
 * 客户端 bundle 报 UnhandledSchemeError。
 *
 * 调用方：server/sms/actions.ts → parseAndSaveSms（仅 server）
 */
import { aiChat, extractJson, AiNotConfiguredError } from "@/lib/ai/client";
import type { ParsedSms } from "./sms-parser";

/**
 * 调用 AI 抽正则做不好的字段：summary 改写 / action 律师动作 / urgency。
 * 不覆盖正则已抽出的硬字段（案号 / 法院 / 日期 / 法庭 / 法官 / 书记员 / 电话 / 上诉期）。
 * AI 失败 / 未配置 / 超时 → 静默返回原 parsed（不抛错）。
 */
export async function enrichWithAi(rawText: string, base: ParsedSms): Promise<ParsedSms> {
  const prompt = `下面是律师收到的一条法院/12368/电子送达短信。请输出 JSON，**只填 3 个字段**：

{
  "summary": "用一句话准确概括短信要点（≤ 40 字，不要复读法院名/案号/日期）",
  "action": "律师应采取的具体动作（≤ 25 字，如：准时出庭、缴纳诉讼费、下载文书、补充证据；如无需动作填 null）",
  "urgency": "HIGH / MEDIUM / LOW（HIGH=72h 内必须处理，MEDIUM=本周处理，LOW=知悉即可）"
}

短信原文：
"""
${rawText.slice(0, 1500)}
"""

只回复 JSON，不要其他文字。`;

  try {
    const res = await aiChat({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 300,
      temperature: 0.2,
      timeoutMs: 12_000
    });
    const json = extractJson<{
      summary?: string;
      action?: string | null;
      urgency?: string;
    }>(res.content);
    if (!json) return base;

    const urgency =
      json.urgency === "HIGH" || json.urgency === "MEDIUM" || json.urgency === "LOW"
        ? (json.urgency as "HIGH" | "MEDIUM" | "LOW")
        : null;

    return {
      ...base,
      summary: json.summary?.trim() || base.summary,
      action: json.action?.trim() || null,
      urgency,
      aiEnriched: true
    };
  } catch (e) {
    if (e instanceof AiNotConfiguredError) {
      // 未配置 = 用户没启用 AI；不抛错，直接返回正则结果
      return base;
    }
    // 网络/超时/解析错也降级
    return base;
  }
}
