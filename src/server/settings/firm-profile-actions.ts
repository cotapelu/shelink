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

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { MatterCategory } from "@prisma/client";

import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { saveFirmProfile, CATEGORY_WORD_DEFAULTS } from "./firm-profile";

const CATEGORY_KEYS = Object.keys(CATEGORY_WORD_DEFAULTS) as MatterCategory[];

/** Khoảng 256KB (trần số ký tự sau khi base64) —— logo văn phòng phải nhỏ hơn nhiều */
const MAX_LOGO_CHARS = 256 * 1024;

const saveSchema = z.object({
  firmName: z.string().trim().max(40).optional(),
  firmSubtitle: z.string().trim().max(40).optional(),
  matterCodePrefix: z.string().trim().max(12).optional(),
  firmShortName: z.string().trim().max(8).optional(),
  caseNoTemplate: z.string().trim().max(60).optional(),
  // undefined = không đổi logo; null hoặc "" = xoá; chuỗi data URL = thay
  logoDataUrl: z.string().nullable().optional(),
  categoryWords: z.record(z.string(), z.string().trim().max(12)).optional()
});

async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("Chỉ quản trị viên được sửa cấu hình thông tin văn phòng");
  }
  return session;
}

export async function saveFirmProfileAction(input: z.infer<typeof saveSchema>) {
  const session = await requireAdmin();
  const data = saveSchema.parse(input);

  // Kiểm tra logo: phải là base64 data URL image/* và có giới hạn kích thước
  if (typeof data.logoDataUrl === "string" && data.logoDataUrl.length > 0) {
    if (!/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/.test(data.logoDataUrl)) {
      throw new Error("Logo phải là ảnh PNG / JPG / WebP / SVG");
    }
    if (data.logoDataUrl.length > MAX_LOGO_CHARS) {
      throw new Error("Logo quá lớn, hãy giữ trong khoảng ~180KB");
    }
  }

  // Chỉ giữ từ không rỗng của các key loại hợp lệ
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

  // Thương hiệu sidebar render ở mọi trang (app) → làm mới toàn layout
  revalidatePath("/", "layout");
  return { ok: true };
}
