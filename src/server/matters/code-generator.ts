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
import { Prisma } from "@prisma/client";
import type { MatterCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { matterCategoryCode } from "@/lib/procedures-by-category";
import { getFirmProfile, CATEGORY_ABBR } from "@/server/settings/firm-profile";
import { renderCaseNoTemplate } from "@/lib/matters/firm-caseno";

/** Bộ đếm atomic trên SystemSetting: key tự tăng và trả về giá trị mới (transaction Serializable tránh xung đột đồng thời) */
async function nextCounter(key: string): Promise<number> {
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.systemSetting.findUnique({ where: { key } });
      const current = (existing?.value as { value?: number })?.value ?? 0;
      const incremented = current + 1;
      await tx.systemSetting.upsert({
        where: { key },
        update: { value: { value: incremented } },
        create: { key, value: { value: incremented } }
      });
      return incremented;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/**
 * Sinh internalCode atomic: {tiền tố}-{YYYY}-{CODE}-{số thứ tự 4 chữ số}
 *
 * Tiền tố cấu hình được ở 「Cài đặt → Thông tin văn phòng」 (mặc định LL). Key đếm dạng `code-counter-2026-CC`.
 */
export async function generateInternalCode(category: MatterCategory): Promise<string> {
  const year = new Date().getFullYear();
  const code = matterCategoryCode[category];
  const { matterCodePrefix } = await getFirmProfile();

  const next = await nextCounter(`code-counter-${year}-${code}`);
  return `${matterCodePrefix}-${year}-${code}-${String(next).padStart(4, "0")}`;
}

/**
 * v0.42 Sinh mã nội bộ (mục 11): render theo mẫu ở 「Cài đặt → Thông tin văn phòng」.
 * Bộ đếm tự tăng độc lập theo năm + loại, key dạng `firm-caseno-2026-CC`.
 * Mẫu rỗng thì fallback mặc định; không nhiễu với bộ đếm internalCode.
 */
export async function generateFirmCaseNo(category: MatterCategory): Promise<string> {
  const year = new Date().getFullYear();
  const code = matterCategoryCode[category];
  const profile = await getFirmProfile();

  const seq = await nextCounter(`firm-caseno-${year}-${code}`);
  return renderCaseNoTemplate(profile.caseNoTemplate, {
    year,
    firmShortName: profile.firmShortName,
    categoryAbbr: CATEGORY_ABBR[category],
    categoryWord: profile.categoryWords[category],
    seq
  });
}
