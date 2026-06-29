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
