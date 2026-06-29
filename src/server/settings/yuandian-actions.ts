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
