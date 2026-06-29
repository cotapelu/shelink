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
import type { MatterCategory } from "@prisma/client";
import type { Prisma } from "@prisma/client";

/**
 * v0.8 默认卷宗结构（按案件类别）
 * 新建 Matter 时自动 seed；isDefault=true 不可删，可改名。
 */
export const DEFAULT_FOLDERS_BY_CATEGORY: Record<MatterCategory, readonly string[]> = {
  CIVIL_COMMERCIAL: ["收案", "立案", "委托手续", "证据", "程序文书", "庭审", "裁判", "结案"],
  LABOR_ARBITRATION: ["收案", "委托手续", "证据", "仲裁文书", "开庭", "裁决", "诉讼", "结案"],
  COMMERCIAL_ARBITRATION: ["收案", "委托手续", "证据", "仲裁文书", "开庭", "裁决", "结案"],
  ADMINISTRATIVE: ["收案", "立案", "委托手续", "证据", "程序文书", "庭审", "裁判", "结案"],
  CRIMINAL: ["收案", "委托手续", "阅卷", "会见", "取证", "庭前", "庭审", "判决与上诉", "结案"],
  NON_LITIGATION: ["立项", "调研", "工作底稿", "出具文件", "归档"],
  LEGAL_COUNSEL: ["立项", "调研", "工作底稿", "出具文件", "归档"],
  SPECIAL_PROJECT: ["立项", "调研", "工作底稿", "出具文件", "归档"]
} as const;

/**
 * 在事务中为新 Matter 创建默认卷宗。
 * 调用方提供 tx；本函数只写库，不做权限/校验。
 */
export async function seedDefaultFolders(
  tx: Prisma.TransactionClient,
  matterId: string,
  category: MatterCategory
) {
  const names = DEFAULT_FOLDERS_BY_CATEGORY[category];
  if (!names || names.length === 0) return;
  await tx.documentFolder.createMany({
    data: names.map((name, i) => ({
      matterId,
      name,
      orderIndex: i,
      isDefault: true
    }))
  });
}

/**
 * 按模板大类推荐默认归档卷宗名（用于"从模板新建"时自动选目标卷宗）。
 * 推荐不到时返回 null，由 UI 让用户手选。
 */
export function suggestFolderByTemplateCategory(
  templateCategory: string,
  matterCategory: MatterCategory
): string | null {
  const isLitigation =
    matterCategory === "CIVIL_COMMERCIAL" ||
    matterCategory === "ADMINISTRATIVE" ||
    matterCategory === "CRIMINAL";

  const mapLitigation: Record<string, string> = {
    INTAKE: "收案",
    RETAINER: "委托手续",
    LITIGATION: matterCategory === "CRIMINAL" ? "庭前" : "程序文书",
    HEARING: matterCategory === "CRIMINAL" ? "庭审" : "庭审",
    WORK_PRODUCT: matterCategory === "CRIMINAL" ? "取证" : "证据",
    ARCHIVE: matterCategory === "CRIMINAL" ? "结案" : "结案",
    CLOSING: "结案",
    BLANK: matterCategory === "CRIMINAL" ? "收案" : "收案"
  };

  const mapNonLitigation: Record<string, string> = {
    INTAKE: "立项",
    RETAINER: "立项",
    LITIGATION: "出具文件",
    HEARING: "工作底稿",
    WORK_PRODUCT: "出具文件",
    ARCHIVE: "归档",
    CLOSING: "归档",
    BLANK: "工作底稿"
  };

  const map = isLitigation ? mapLitigation : mapNonLitigation;
  return map[templateCategory] ?? null;
}
