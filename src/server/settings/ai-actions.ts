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

import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import {
  saveAiSettings as saveSettings,
  readPublicAiSettings,
  AI_DEFAULTS
} from "@/lib/ai/settings";
import { aiChat, AiNotConfiguredError } from "@/lib/ai/client";

const saveSchema = z.object({
  apiKey: z.string().optional().or(z.literal("")), // 留空 = 保留原值
  baseUrl: z.string().url().optional().or(z.literal("")),
  textModel: z.string().max(80).optional().or(z.literal("")),
  visionModel: z.string().max(80).optional().or(z.literal(""))
});

const clearSchema = z.object({ confirm: z.literal(true) });

async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("仅管理员可修改 AI 配置");
  }
  return session;
}

export async function getAiSettingsPublic() {
  await requireAdmin();
  return readPublicAiSettings();
}

export async function saveAiSettingsAction(input: z.infer<typeof saveSchema>) {
  const session = await requireAdmin();
  const data = saveSchema.parse(input);

  await saveSettings({
    apiKey: data.apiKey?.trim() || undefined,
    baseUrl: data.baseUrl?.trim() || undefined,
    textModel: data.textModel?.trim() || undefined,
    visionModel: data.visionModel?.trim() || undefined
  });

  await audit({
    userId: session.user.id,
    action: "AI_SETTINGS_SAVE",
    targetType: "SystemSetting",
    targetId: "aiSettings",
    detail: {
      changedKey: !!data.apiKey,
      baseUrl: data.baseUrl || null,
      textModel: data.textModel || null
    }
  });

  return { ok: true };
}

export async function clearAiKeyAction(input: z.infer<typeof clearSchema>) {
  const session = await requireAdmin();
  clearSchema.parse(input);

  await saveSettings({ clearKey: true });

  await audit({
    userId: session.user.id,
    action: "AI_SETTINGS_CLEAR_KEY",
    targetType: "SystemSetting",
    targetId: "aiSettings"
  });

  return { ok: true };
}

/** 测试连接：发一个 ping，验证 base_url + key + text_model 可用 */
export async function testAiConnection() {
  await requireAdmin();
  try {
    const res = await aiChat({
      messages: [
        { role: "system", content: "You are a connectivity probe. Reply only with 'pong'." },
        { role: "user", content: "ping" }
      ],
      maxTokens: 10,
      temperature: 0,
      timeoutMs: 10_000
    });
    const replyTrimmed = (res.content || "").slice(0, 100);
    return { ok: true, reply: replyTrimmed };
  } catch (e) {
    if (e instanceof AiNotConfiguredError) {
      return { ok: false, message: e.message };
    }
    return {
      ok: false,
      message: e instanceof Error ? e.message : "未知错误"
    };
  }
}
