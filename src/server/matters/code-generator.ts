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
import { Prisma } from "@prisma/client";
import type { MatterCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { matterCategoryCode } from "@/lib/procedures-by-category";
import { getFirmProfile, CATEGORY_ABBR } from "@/server/settings/firm-profile";
import { renderCaseNoTemplate } from "@/lib/matters/firm-caseno";

/** SystemSetting 原子计数器：key 自增并返回新值（serializable 防并发冲突） */
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
 * 原子生成 internalCode：{前缀}-{YYYY}-{CODE}-{4位流水}
 *
 * 前缀可在「设置 → 律所信息」配置（默认 LL）。计数器 key 形如 `code-counter-2026-CC`。
 */
export async function generateInternalCode(category: MatterCategory): Promise<string> {
  const year = new Date().getFullYear();
  const code = matterCategoryCode[category];
  const { matterCodePrefix } = await getFirmProfile();

  const next = await nextCounter(`code-counter-${year}-${code}`);
  return `${matterCodePrefix}-${year}-${code}-${String(next).padStart(4, "0")}`;
}

/**
 * v0.42 生成所内案号（项 11）：按「设置 → 律所信息」的模板渲染。
 * 计数器按 年 + 类别 独立自增，key 形如 `firm-caseno-2026-CC`。
 * 模板为空时回退默认；与 internalCode 计数器互不干扰。
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
