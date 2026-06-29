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
 * v0.9.4 归档只读门禁
 *
 * 策略（用户选择"中"）：
 *   - 案件 status === "ARCHIVED" 后：业务写操作全禁
 *   - 例外：补传材料到 ARCHIVE 卷宗（结案/归档）允许
 *
 * 调用方式（每个写操作 server action 入口）：
 *   await assertMatterWritable(matterId);
 *
 * 文档上传 / 删除 需要 isArchiveFolder() 配合放行 ARCHIVE 卷宗。
 */
import { requireSession } from "@/lib/auth/session";
import { matterAssociationFilter } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type WritableGuardOptions = {
  allowedIfArchivedReason?: string;
  allowFinanceRole?: boolean;
};

async function findWritableMatter(
  matterId: string,
  opts?: Pick<WritableGuardOptions, "allowFinanceRole">
) {
  const session = await requireSession();
  const allowByFinanceRole = opts?.allowFinanceRole && session.user.role === "FINANCE";
  return prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      ...(allowByFinanceRole ? {} : matterAssociationFilter(session.user.id))
    },
    select: { status: true, archivedAt: true }
  });
}

/**
 * 已归档案件视为只读。抛错（中文）由 UI catch 显示 toast。
 */
export async function assertMatterWritable(
  matterId: string | null | undefined,
  opts?: WritableGuardOptions
): Promise<void> {
  if (!matterId) return;
  const matter = await findWritableMatter(matterId, opts);
  if (!matter) throw new Error("案件不存在或无权处理");
  if (matter.status === "ARCHIVED") {
    const detail = opts?.allowedIfArchivedReason
      ? `（${opts.allowedIfArchivedReason}除外）`
      : "";
    throw new Error(`案件已归档，禁止修改${detail}`);
  }
}

/**
 * 判定 folder 是否为 ARCHIVE 卷宗（结案 / 归档），用于上传材料门禁放行。
 * 命中条件：name 命中 ["结案", "归档"] 之一（与 default-folders.ts 一致）。
 */
const ARCHIVE_FOLDER_NAMES = new Set(["结案", "归档"]);

export function isArchiveFolderName(name: string | null | undefined): boolean {
  if (!name) return false;
  return ARCHIVE_FOLDER_NAMES.has(name);
}

/**
 * 文档操作门禁：归档后只允许上传到 ARCHIVE 卷宗。删除/重命名/移动一律禁止。
 */
export async function assertDocumentWritable(
  matterId: string | null | undefined,
  opts: { kind: "upload" | "modify"; folderName?: string | null; allowFinanceRole?: boolean }
): Promise<void> {
  if (!matterId) return;
  const matter = await findWritableMatter(matterId, opts);
  if (!matter) throw new Error("案件不存在或无权处理");
  if (matter.status !== "ARCHIVED") return;

  if (opts.kind === "modify") {
    throw new Error("案件已归档，材料不可修改或删除");
  }
  if (opts.kind === "upload" && !isArchiveFolderName(opts.folderName)) {
    throw new Error("案件已归档，仅允许补传材料到「结案」或「归档」卷宗");
  }
}
