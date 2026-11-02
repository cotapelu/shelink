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
 * v0.19: Kiểm tra văn bản thông minh
 *
 * Đọc tài liệu từ storage → trích văn bản (PDF/DOCX/văn bản thuần) → đưa vào AI → danh sách kiểm tra có cấu trúc.
 * Hiện phủ văn bản chung (hợp đồng, đơn khởi kiện, đơn yêu cầu, thỏa thuận, chứng cứ văn bản...), mọi loại văn bản dùng chung một prompt.
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
  /** v0.21: ReviewRecord.id sau khi ghi DB; doc không thuộc Matter (vd giai đoạn intake) thì null */
  recordId: string | null;
};

// v0.26: prompt phân nhánh theo Document.category (src/lib/ai/review-prompts.ts)

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
  throw new Error("Không hỗ trợ định dạng .doc cũ, hãy lưu lại thành .docx rồi tải lên");
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
  throw new Error(`Loại tài liệu không hỗ trợ (${mimeType ?? "không rõ"}), hiện chỉ hỗ trợ PDF / DOCX / văn bản thuần`);
}

async function loadDocumentForReview(input: { documentId: string }, session: { user: { id: string; role: string } }) {
  const doc = await prisma.document.findFirst({
    where: { id: input.documentId, deletedAt: null }
  });
  if (!doc) throw new Error("Tài liệu không tồn tại");
  if (doc.matterId) {
    await assertCanAccessMatter(session.user.id, session.user.role, doc.matterId);
  }
  return doc;
}

async function prepareDocumentBuffer(doc: any) {
  const stored = await storage.readFile(doc.path);
  if (doc.encrypted) {
    if (!doc.iv || !doc.authTag) throw new Error("Siêu dữ liệu mã hoá bị hỏng");
    return decryptBuffer(stored, doc.iv, doc.authTag);
  }
  return stored;
}

async function prepareReviewText(buf: Buffer, mimeType: string | null, maxChars = MAX_CHARS_FOR_AI) {
  const raw = (await extractDocumentText(buf, mimeType)).trim();
  if (raw.length < 20) {
    throw new Error("Không có văn bản để phân tích (có thể là PDF scan / tài liệu rỗng), hãy dùng PDF có lớp văn bản hoặc DOCX");
  }
  const truncated = raw.length > maxChars;
  const text = truncated ? raw.slice(0, maxChars) : raw;
  return { text, truncated, rawLength: raw.length };
}

function buildReviewPrompt(doc: any, text: string, truncated: boolean) {
  const systemPrompt = selectReviewPrompt(doc.category);
  const promptLabel = reviewPromptLabel(doc.category);
  const userContent = `Tên văn bản: ${doc.name}\nLoại kiểm tra: ${promptLabel}\n\nNội dung văn bản:\n${text}${truncated ? "\n\n(Ghi chú: bản gốc dài, đã cắt phần đầu để kiểm tra)" : ""}`;
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
    throw new Error(err instanceof Error ? err.message : "Yêu cầu kiểm tra AI thất bại");
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
