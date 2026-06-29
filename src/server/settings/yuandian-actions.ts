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
  saveYuandianSettings as saveSettings,
  readPublicYuandianSettings,
  YUANDIAN_DEFAULTS
} from "@/lib/yuandian/settings";
import {
  searchPtalCases,
  YuandianNotConfiguredError,
  YuandianApiError
} from "@/lib/yuandian/client";

const saveSchema = z.object({
  apiKey: z.string().optional().or(z.literal("")),
  baseUrl: z.string().url().optional().or(z.literal("")),
  caseDetailHost: z.string().url().optional().or(z.literal(""))
});

const clearSchema = z.object({ confirm: z.literal(true) });

async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("仅管理员可修改元典配置");
  }
  return session;
}

export async function getYuandianSettingsPublic() {
  await requireAdmin();
  return readPublicYuandianSettings();
}

export async function saveYuandianSettingsAction(input: z.infer<typeof saveSchema>) {
  const session = await requireAdmin();
  const data = saveSchema.parse(input);

  await saveSettings({
    apiKey: data.apiKey?.trim() || undefined,
    baseUrl: data.baseUrl?.trim() || undefined,
    caseDetailHost: data.caseDetailHost?.trim() || undefined
  });

  await audit({
    userId: session.user.id,
    action: "YUANDIAN_SETTINGS_SAVE",
    targetType: "SystemSetting",
    targetId: "yuandianSettings",
    detail: { changedKey: !!data.apiKey, baseUrl: data.baseUrl || null }
  });
  return { ok: true };
}

export async function clearYuandianKeyAction(input: z.infer<typeof clearSchema>) {
  const session = await requireAdmin();
  clearSchema.parse(input);
  await saveSettings({ clearKey: true });
  await audit({
    userId: session.user.id,
    action: "YUANDIAN_KEY_CLEAR",
    targetType: "SystemSetting",
    targetId: "yuandianSettings",
    detail: {}
  });
  return { ok: true };
}

/**
 * 用最小代价探活：用"民间借贷纠纷 / top_k=1"试探，扣 10 POINT。
 */
export async function testYuandianConnection(): Promise<{
  ok: boolean;
  message?: string;
}> {
  await requireAdmin();
  try {
    const r = await searchPtalCases({ ay: ["民间借贷纠纷"], top_k: 1 });
    return { ok: true, message: `连接成功，命中 ${r.total} 条（已扣 10 POINT 试调用）` };
  } catch (err) {
    if (err instanceof YuandianNotConfiguredError) {
      return { ok: false, message: err.message };
    }
    if (err instanceof YuandianApiError) {
      return { ok: false, message: `元典返回错误：${err.message}` };
    }
    return { ok: false, message: err instanceof Error ? err.message : "未知错误" };
  }
}
