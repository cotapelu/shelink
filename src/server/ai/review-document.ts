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
 * v0.19: 文书智能审查
 *
 * 从存储读文档 → 抽文本（PDF/DOCX/纯文本）→ 喂 AI → 结构化审查清单。
 * 目前覆盖通用文书（合同、起诉状、申请书、协议、书证等），不分文书类型走同一 prompt。
 */
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { assertCanAccessMatter } from "@/lib/permissions";
import { storage } from "@/lib/storage";
import { decryptBuffer } from "@/lib/storage/crypto";
import { aiChat, AiNotConfiguredError } from "@/lib/ai/client";
import {
  parseReviewItems,
  type ReviewItem,
  type ReviewType,
  type ReviewSeverity
} from "@/lib/ai/review-parser";
import { selectReviewPrompt, reviewPromptLabel } from "@/lib/ai/review-prompts";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

export type { ReviewItem, ReviewType, ReviewSeverity };

export type ReviewResult = {
  documentName: string;
  textPreviewChars: number;
  truncated: boolean;
  items: ReviewItem[];
  /** v0.21: 落库后的 ReviewRecord.id；doc 不属于 Matter（如 intake 阶段）则为 null */
  recordId: string | null;
};

// v0.26: prompt 按 Document.category 分流（src/lib/ai/review-prompts.ts）

const MAX_CHARS_FOR_AI = 6000;

async function extractPdfText(buf: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

async function extractDocxText(buf: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return value;
}

function extractDocText(): never {
  throw new Error("不支持老 .doc 格式，请另存为 .docx 后重新上传");
}

function extractPlainText(buf: Buffer): string {
  return buf.toString("utf8");
}

async function extractDocumentText(buf: Buffer, mimeType: string | null): Promise<string> {
  const mt = (mimeType ?? "").toLowerCase();
  if (mt === "application/pdf") return await extractPdfText(buf);
  if (mt === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || mt === "application/docx") {
    return await extractDocxText(buf);
  }
  if (mt === "application/msword") return extractDocText();
  if (mt.startsWith("text/")) return await extractPlainText(buf);
  throw new Error(`不支持的文档类型 (${mimeType ?? "未知"})，目前仅支持 PDF / DOCX / 纯文本`);
}

async function loadDocumentForReview(input: { documentId: string }, session: { user: { id: string; role: string } }) {
  const doc = await prisma.document.findFirst({
    where: { id: input.documentId, deletedAt: null }
  });
  if (!doc) throw new Error("材料不存在");
  if (doc.matterId) {
    await assertCanAccessMatter(session.user.id, session.user.role, doc.matterId);
  }
  return doc;
}

async function prepareDocumentBuffer(doc: any) {
  const stored = await storage.readFile(doc.path);
  if (doc.encrypted) {
    if (!doc.iv || !doc.authTag) throw new Error("加密元数据损坏");
    return decryptBuffer(stored, doc.iv, doc.authTag);
  }
  return stored;
}

async function prepareReviewText(buf: Buffer, mimeType: string | null, maxChars = MAX_CHARS_FOR_AI) {
  const raw = (await extractDocumentText(buf, mimeType)).trim();
  if (raw.length < 20) {
    throw new Error("无可分析文本（可能是扫描件 PDF / 空文档），请用文本层 PDF 或 DOCX");
  }
  const truncated = raw.length > maxChars;
  const text = truncated ? raw.slice(0, maxChars) : raw;
  return { text, truncated, rawLength: raw.length };
}

function buildReviewPrompt(doc: any, text: string, truncated: boolean) {
  const systemPrompt = selectReviewPrompt(doc.category);
  const promptLabel = reviewPromptLabel(doc.category);
  const userContent = `文书名称：${doc.name}\n审查类型：${promptLabel}\n\n文书正文：\n${text}${truncated ? "\n\n（注：原文较长，已截断前部分内容供审查）" : ""}`;
  return { systemPrompt, userContent };
}

async function executeReviewAI(systemPrompt: string, userContent: string) {
  try {
    const res = await aiChat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      maxTokens: 2000,
      temperature: 0.2,
      timeoutMs: 45_000
    });
    return res.content;
  } catch (err) {
    if (err instanceof AiNotConfiguredError) throw err;
    throw new Error(err instanceof Error ? err.message : "AI 审查请求失败");
  }
}

async function persistReviewIfNeeded(doc: any, session: { user: { id: string } }, items: any[], textLen: number, truncated: boolean) {
  if (!doc.matterId) return null;
  const rec = await prisma.reviewRecord.create({
    data: {
      matterId: doc.matterId,
      documentId: doc.id,
      reviewedById: session.user.id,
      itemCount: items.length,
      itemsJson: items as unknown as object,
      textPreviewChars: textLen,
      truncated
    },
    select: { id: true }
  });
  return rec.id;
}

export async function reviewDocument(input: {
  documentId: string;
}): Promise<ReviewResult> {
  const session = await requireSession();
  const doc = await loadDocumentForReview(input, session);
  const buf = await prepareDocumentBuffer(doc);
  const { text, truncated, rawLength } = await prepareReviewText(buf, doc.mimeType);
  const { systemPrompt, userContent } = buildReviewPrompt(doc, text, truncated);
  const content = await executeReviewAI(systemPrompt, userContent);
  const items = parseReviewItems(content);
  const recordId = await persistReviewIfNeeded(doc, session, items, rawLength, truncated);
  return {
    documentName: doc.name,
    textPreviewChars: rawLength,
    truncated,
    items,
    recordId
  };
}
