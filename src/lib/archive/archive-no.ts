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
/**
 * v0.9.4 归档编号生成
 *
 * 格式：YYYY-类别-NNNN
 *   - YYYY = 归档年份（archivedAt 当年）
 *   - 类别简称 = 1 个汉字
 *   - NNNN = 年内同类别归档序号（零填 4 位，从 0001 起）
 *
 * 示例：2026-民-0017
 *
 * 并发：依赖 @@unique(archiveNo)。重复时回到查 max 再 +1（最多重试 3 次）。
 */
import type { MatterCategory } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

const CATEGORY_SHORT: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "民",
  LABOR_ARBITRATION: "劳",
  COMMERCIAL_ARBITRATION: "商",
  CRIMINAL: "刑",
  ADMINISTRATIVE: "行",
  NON_LITIGATION: "非",
  LEGAL_COUNSEL: "顾",
  SPECIAL_PROJECT: "专"
};

export function categoryShort(category: MatterCategory): string {
  return CATEGORY_SHORT[category] ?? "案";
}

export async function nextArchiveNo(
  tx: Pick<PrismaClient, "archiveRecord">,
  category: MatterCategory,
  archivedAt: Date = new Date()
): Promise<string> {
  const year = archivedAt.getFullYear();
  const short = categoryShort(category);
  const prefix = `${year}-${short}-`;

  // 取年内同前缀的最大 archiveNo
  const existing = await tx.archiveRecord.findMany({
    where: { archiveNo: { startsWith: prefix } },
    select: { archiveNo: true },
    orderBy: { archiveNo: "desc" },
    take: 1
  });

  let next = 1;
  if (existing.length > 0) {
    const m = existing[0].archiveNo.match(/-(\d{4})$/);
    if (m) next = parseInt(m[1], 10) + 1;
  }

  return `${prefix}${String(next).padStart(4, "0")}`;
}
