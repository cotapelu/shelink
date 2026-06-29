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
import { redirect } from "next/navigation";
import type { MatterCategory } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { matterCategoryLabel } from "@/lib/enums";
import {
  getFirmProfile,
  CATEGORY_ABBR,
  CATEGORY_WORD_DEFAULTS
} from "@/server/settings/firm-profile";
import { FirmProfileForm } from "./_components/firm-profile-form";

export default async function FirmProfilePage() {
  const session = await getSession();
  if (session?.user.role !== "ADMIN") redirect("/settings/profile");

  const profile = await getFirmProfile();
  const keys = Object.keys(CATEGORY_WORD_DEFAULTS) as MatterCategory[];
  // 服务端构造类别清单（label/简称/当前词）传给客户端表单，避免 client 直接 import 含 prisma 的模块
  const categories = keys.map((key) => ({
    key,
    label: matterCategoryLabel[key],
    abbr: CATEGORY_ABBR[key],
    word: profile.categoryWords[key]
  }));

  return (
    <FirmProfileForm
      initial={{
        firmName: profile.firmName,
        firmSubtitle: profile.firmSubtitle,
        logoDataUrl: profile.logoDataUrl,
        matterCodePrefix: profile.matterCodePrefix,
        firmShortName: profile.firmShortName,
        caseNoTemplate: profile.caseNoTemplate,
        categories
      }}
    />
  );
}
