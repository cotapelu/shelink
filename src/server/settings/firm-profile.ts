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
/**
 * v0.42 Cấu hình thông tin律所 / Hệ thống mã số (Mục 1 + Mục 11)
 *
 * Single SystemSetting key `firmProfile`, value là JSON:
 *   - firmName / firmSubtitle / logoDataUrl: Thương hiệu sidebar (mặc định LawLink / Lawyer Workspace)
 *   - matterCodePrefix: Tiền tố mã nội bộ (phần LL của internalCode, mặc định LL)
 *   - firmShortName / caseNoTemplate / categoryWords: Template mã số nội bộ và ánh xạ từng phần
 *
 * Theo dõi mẫu "single key + typed CRUD" từ src/lib/ai/settings.ts. Logo lưu trực tiếp
 * dưới dạng base64 data URL (logo律所 nhỏ), tránh thêm storage/route phụ thuộc.
 */
import type { MatterCategory } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const FIRM_PROFILE_KEY = "firmProfile";

/** {Từ loại} ánh xạ mặc định: Có thể chỉnh sửa từng loại trong trang cài đặt */
export const CATEGORY_WORD_DEFAULTS: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "Dân sự",
  LABOR_ARBITRATION: "Lao động & Trọng tài",
  COMMERCIAL_ARBITRATION: "Thương mại & Trọng tài",
  CRIMINAL: "Hình sự",
  ADMINISTRATIVE: "Hành chính",
  NON_LITIGATION: "Phi tố tụng",
  LEGAL_COUNSEL: "Tư vấn",
  SPECIAL_PROJECT: "Dự án đặc biệt"
};

/** {Loại} từ viết tắt 1 ký tự (cố định, không chỉnh sửa được) */
export const CATEGORY_ABBR: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "民",
  LABOR_ARBITRATION: "劳",
  COMMERCIAL_ARBITRATION: "商",
  CRIMINAL: "刑",
  ADMINISTRATIVE: "行",
  NON_LITIGATION: "非",
  LEGAL_COUNSEL: "顾",
  SPECIAL_PROJECT: "专"
};

export interface FirmProfile {
  firmName: string;
  firmSubtitle: string;
  logoDataUrl: string | null;
  matterCodePrefix: string;
  firmShortName: string;
  caseNoTemplate: string;
  categoryWords: Record<MatterCategory, string>;
}

export const FIRM_PROFILE_DEFAULTS: FirmProfile = {
  firmName: "LawLink",
  firmSubtitle: "Không gian làm việc luật sư",
  logoDataUrl: null,
  matterCodePrefix: "LL",
  firmShortName: "",
  caseNoTemplate: "{年}-{所}{类词}-{序3}",
  categoryWords: CATEGORY_WORD_DEFAULTS
};

function pickFirmName(s: Partial<FirmProfile>) { return s.firmName || FIRM_PROFILE_DEFAULTS.firmName; }
function pickFirmSubtitle(s: Partial<FirmProfile>) { return s.firmSubtitle ?? FIRM_PROFILE_DEFAULTS.firmSubtitle; }
function pickLogoDataUrl(s: Partial<FirmProfile>) { return s.logoDataUrl ?? null; }
function pickMatterCodePrefix(s: Partial<FirmProfile>) { return (s.matterCodePrefix?.trim() || FIRM_PROFILE_DEFAULTS.matterCodePrefix); }
function pickFirmShortName(s: Partial<FirmProfile>) { return s.firmShortName ?? FIRM_PROFILE_DEFAULTS.firmShortName; }
function pickCaseNoTemplate(s: Partial<FirmProfile>) { return (s.caseNoTemplate?.trim() || FIRM_PROFILE_DEFAULTS.caseNoTemplate); }
function pickCategoryWords(s: Partial<FirmProfile>) { return { ...CATEGORY_WORD_DEFAULTS, ...(s.categoryWords ?? {}) }; }

export async function getFirmProfile(): Promise<FirmProfile> {
  const row = await prisma.systemSetting.findUnique({ where: { key: FIRM_PROFILE_KEY } });
  const s = (row?.value as Partial<FirmProfile> | null) ?? {};
  return {
    firmName: pickFirmName(s),
    firmSubtitle: pickFirmSubtitle(s),
    logoDataUrl: pickLogoDataUrl(s),
    matterCodePrefix: pickMatterCodePrefix(s),
    firmShortName: pickFirmShortName(s),
    caseNoTemplate: pickCaseNoTemplate(s),
    categoryWords: pickCategoryWords(s)
  };
}

export async function saveFirmProfile(patch: Partial<FirmProfile>): Promise<FirmProfile> {
  const current = await getFirmProfile();
  // Merge từng field rõ ràng: undefined nghĩa là "không đổi" (spread object sẽ ghi đè undefined, nên dùng ??).
  // logoDataUrl đặc biệt: undefined = giữ nguyên, null = xóa.
  const next: FirmProfile = {
    firmName: patch.firmName ?? current.firmName,
    firmSubtitle: patch.firmSubtitle ?? current.firmSubtitle,
    logoDataUrl: patch.logoDataUrl === undefined ? current.logoDataUrl : patch.logoDataUrl,
    matterCodePrefix: patch.matterCodePrefix ?? current.matterCodePrefix,
    firmShortName: patch.firmShortName ?? current.firmShortName,
    caseNoTemplate: patch.caseNoTemplate ?? current.caseNoTemplate,
    categoryWords: { ...current.categoryWords, ...(patch.categoryWords ?? {}) }
  };
  await prisma.systemSetting.upsert({
    where: { key: FIRM_PROFILE_KEY },
    update: { value: next as object },
    create: { key: FIRM_PROFILE_KEY, value: next as object }
  });
  return next;
}
