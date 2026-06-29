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

/**
 * v0.20: 文书 AI 审查结果保存为案件 Document（与 A3 类案存档对称的模式）
 */
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { assertCanAccessMatter } from "@/lib/permissions";
import { storage } from "@/lib/storage";
import { sha256 } from "@/lib/storage/crypto";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import type {
  ReviewItem,
  ReviewType,
  ReviewSeverity
} from "@/lib/ai/review-parser";

const TYPE_CN: Record<ReviewType, string> = {
  MISSING: "缺失要素",
  RISK: "法律风险",
  ISSUE: "条款问题",
  SUGGESTION: "优化建议"
};

const SEV_CN: Record<ReviewSeverity, string> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低"
};

function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").slice(0, 60);
}

function buildMarkdown(
  reviewedDocName: string,
  items: ReviewItem[]
): string {
  const now = new Date().toLocaleString("zh-CN");
  const lines: string[] = [
    `# AI 审查结果：${reviewedDocName}`,
    "",
    `- **审查时间**：${now}`,
    `- **审查条数**：${items.length}`,
    "",
    "---",
    ""
  ];
  if (items.length === 0) {
    lines.push("> AI 未发现明显问题。");
    return lines.join("\n");
  }
  // 按 type 分组输出
  const groups: ReviewType[] = ["MISSING", "RISK", "ISSUE", "SUGGESTION"];
  for (const t of groups) {
    const sub = items.filter((i) => i.type === t);
    if (sub.length === 0) continue;
    lines.push(`## ${TYPE_CN[t]}（${sub.length}）`, "");
    for (const it of sub) {
      lines.push(`- **${it.title}** \`${SEV_CN[it.severity]}\``);
      lines.push(`  - ${it.detail}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export async function saveReviewToMatter(input: {
  matterId: string;
  reviewedDocId: string;
  reviewedDocName: string;
  items: ReviewItem[];
}): Promise<{ ok: true; documentId: string; documentName: string }> {
  const session = await requireSession();
  await assertCanAccessMatter(session.user.id, session.user.role, input.matterId);

  const matter = await prisma.matter.findUnique({
    where: { id: input.matterId, deletedAt: null },
    select: { id: true, status: true }
  });
  if (!matter) throw new Error("案件不存在");
  if (matter.status === "ARCHIVED") {
    throw new Error("案件已归档（只读），不能再保存审查结果");
  }

  const md = buildMarkdown(input.reviewedDocName, input.items);
  const buf = Buffer.from(md, "utf-8");
  const path = await storage.writeFile(`m_${input.matterId}`, buf);
  const hash = sha256(buf);
  const ts = new Date().toISOString().slice(0, 10);
  const docName = `AI审查_${safeFileName(input.reviewedDocName)}_${ts}.md`;

  const doc = await prisma.document.create({
    data: {
      matterId: input.matterId,
      uploadedById: session.user.id,
      name: docName,
      category: "OTHER",
      path,
      mimeType: "text/markdown",
      size: buf.byteLength,
      sha256: hash,
      encrypted: false,
      tags: ["AI审查", "存档"]
    },
    select: { id: true, name: true }
  });

  await audit({
    userId: session.user.id,
    action: "AI_REVIEW_SAVE",
    targetType: "Matter",
    targetId: input.matterId,
    detail: {
      reviewedDocId: input.reviewedDocId,
      reviewedDocName: input.reviewedDocName,
      itemCount: input.items.length,
      documentId: doc.id
    }
  });

  revalidatePath(`/matters/${input.matterId}`);
  return { ok: true, documentId: doc.id, documentName: doc.name };
}
