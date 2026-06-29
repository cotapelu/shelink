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

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { MatterCategory } from "@prisma/client";

import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { saveFirmProfile, CATEGORY_WORD_DEFAULTS } from "./firm-profile";

const CATEGORY_KEYS = Object.keys(CATEGORY_WORD_DEFAULTS) as MatterCategory[];

/** 约 256KB（base64 编码后的字符长度上限）——律所 logo 应远小于此 */
const MAX_LOGO_CHARS = 256 * 1024;

const saveSchema = z.object({
  firmName: z.string().trim().max(40).optional(),
  firmSubtitle: z.string().trim().max(40).optional(),
  matterCodePrefix: z.string().trim().max(12).optional(),
  firmShortName: z.string().trim().max(8).optional(),
  caseNoTemplate: z.string().trim().max(60).optional(),
  // undefined=不改 logo；null 或 "" =清除；data URL 字符串=替换
  logoDataUrl: z.string().nullable().optional(),
  categoryWords: z.record(z.string(), z.string().trim().max(12)).optional()
});

async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("仅管理员可修改律所信息配置");
  }
  return session;
}

export async function saveFirmProfileAction(input: z.infer<typeof saveSchema>) {
  const session = await requireAdmin();
  const data = saveSchema.parse(input);

  // Logo 校验：必须是 image/* 的 base64 data URL，且体积受限
  if (typeof data.logoDataUrl === "string" && data.logoDataUrl.length > 0) {
    if (!/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/.test(data.logoDataUrl)) {
      throw new Error("Logo 必须是 PNG / JPG / WebP / SVG 图片");
    }
    if (data.logoDataUrl.length > MAX_LOGO_CHARS) {
      throw new Error("Logo 体积过大，请控制在约 180KB 以内");
    }
  }

  // 只保留有效类别键的非空词
  let categoryWords: Partial<Record<MatterCategory, string>> | undefined;
  if (data.categoryWords) {
    categoryWords = {};
    for (const key of CATEGORY_KEYS) {
      const word = data.categoryWords[key];
      if (typeof word === "string" && word.length > 0) categoryWords[key] = word;
    }
  }

  await saveFirmProfile({
    firmName: data.firmName,
    firmSubtitle: data.firmSubtitle,
    matterCodePrefix: data.matterCodePrefix,
    firmShortName: data.firmShortName,
    caseNoTemplate: data.caseNoTemplate,
    logoDataUrl:
      data.logoDataUrl === undefined
        ? undefined
        : data.logoDataUrl
          ? data.logoDataUrl
          : null,
    categoryWords: categoryWords as Record<MatterCategory, string> | undefined
  });

  await audit({
    userId: session.user.id,
    action: "FIRM_PROFILE_SAVE",
    targetType: "SystemSetting",
    targetId: "firmProfile"
  });

  // 侧栏品牌在所有 (app) 页面渲染 → 刷新整个布局
  revalidatePath("/", "layout");
  return { ok: true };
}
