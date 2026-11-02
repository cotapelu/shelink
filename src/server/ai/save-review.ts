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

/**
 * v0.20: Lưu kết quả kiểm tra AI văn bản thành Document của vụ án (mẫu đối xứng với lưu trữ类案 (vụ án cùng loại) A3 — giữ thuật ngữ)
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
  MISSING: "Yếu tố còn thiếu",
  RISK: "Rủi ro pháp lý",
  ISSUE: "Vấn đề điều khoản",
  SUGGESTION: "Đề xuất tối ưu"
};

const SEV_CN: Record<ReviewSeverity, string> = {
  HIGH: "Cao",
  MEDIUM: "Trung bình",
  LOW: "Thấp"
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
    `# Kết quả kiểm tra AI: ${reviewedDocName}`,
    "",
    `- **Thời gian kiểm tra**: ${now}`,
    `- **Số mục kiểm tra**: ${items.length}`,
    "",
    "---",
    ""
  ];
  if (items.length === 0) {
    lines.push("> AI không phát hiện vấn đề rõ rệt nào.");
    return lines.join("\n");
  }
  // Xuất theo nhóm type
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
  if (!matter) throw new Error("Vụ án không tồn tại");
  if (matter.status === "ARCHIVED") {
    throw new Error("Vụ án đã lưu trữ (chỉ đọc), không lưu được kết quả kiểm tra nữa");
  }

  const md = buildMarkdown(input.reviewedDocName, input.items);
  const buf = Buffer.from(md, "utf-8");
  const path = await storage.writeFile(`m_${input.matterId}`, buf);
  const hash = sha256(buf);
  const ts = new Date().toISOString().slice(0, 10);
  const docName = `KiemTraAI_${safeFileName(input.reviewedDocName)}_${ts}.md`;

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
      tags: ["Kiểm tra AI", "Lưu trữ"]
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
