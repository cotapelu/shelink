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
/**
 * Luồng duyệt văn bản (submit → approve/reject → file) — tách từ documents/actions.ts (AUTO-67d).
 */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertDocumentWritable } from "@/lib/archive/guard";
import { isManager, assertCanAccessMatter } from "@/lib/permissions";

// ============ v0.10: Luồng duyệt văn bản ============

async function loadReviewDocument(userId: string, role: string, id: string) {
  const doc = await prisma.document.findUnique({ where: { id, deletedAt: null } });
  if (!doc) throw new Error("Tài liệu không tồn tại");
  if (doc.matterId) {
    await assertCanAccessMatter(userId, role, doc.matterId);
    await assertDocumentWritable(doc.matterId, { kind: "modify" });
  }
  return doc;
}

function assertReviewManager(role: string) {
  if (!isManager(role)) {
    throw new Error("Chỉ quản trị viên hoặc luật sư chủ trì được duyệt văn bản");
  }
}

function documentAuditDetail(doc: { matterId: string | null; name: string }, extra: Record<string, unknown> = {}) {
  return { matterId: doc.matterId, name: doc.name, ...extra };
}

function revalidateMatter(matterId: string | null) {
  if (matterId) revalidatePath(`/matters/${matterId}`);
}

export async function submitDocumentForReview(id: string) {
  const session = await requireSession();
  const doc = await loadReviewDocument(session.user.id, session.user.role, id);
  if (doc.status !== "DRAFT") throw new Error("Chỉ tài liệu ở trạng thái nháp mới gửi duyệt được");

  await prisma.document.update({ where: { id }, data: { status: "PENDING_REVIEW" } });
  await audit({ userId: session.user.id, action: "DOCUMENT_SUBMIT_REVIEW", targetType: "Document", targetId: id, detail: documentAuditDetail(doc) });

  revalidateMatter(doc.matterId);
  return { ok: true };
}

export async function approveDocument(id: string) {
  const session = await requireSession();
  assertReviewManager(session.user.role);
  const doc = await loadReviewDocument(session.user.id, session.user.role, id);
  if (doc.status !== "PENDING_REVIEW") throw new Error("Tài liệu không ở trạng thái chờ duyệt");

  await prisma.document.update({
    where: { id },
    data: { status: "APPROVED", approvedById: session.user.id, approvedAt: new Date() }
  });
  await audit({ userId: session.user.id, action: "DOCUMENT_APPROVE", targetType: "Document", targetId: id, detail: documentAuditDetail(doc) });

  revalidateMatter(doc.matterId);
  return { ok: true };
}

export async function rejectDocument(id: string, reason?: string) {
  const session = await requireSession();
  assertReviewManager(session.user.role);
  const doc = await loadReviewDocument(session.user.id, session.user.role, id);
  if (doc.status !== "PENDING_REVIEW") throw new Error("Tài liệu không ở trạng thái chờ duyệt");

  await prisma.document.update({
    where: { id },
    data: { status: "DRAFT", reviewedById: session.user.id, reviewedAt: new Date() }
  });
  await audit({ userId: session.user.id, action: "DOCUMENT_REJECT", targetType: "Document", targetId: id, detail: documentAuditDetail(doc, { reason }) });

  revalidateMatter(doc.matterId);
  return { ok: true };
}

export async function fileDocument(id: string) {
  const session = await requireSession();
  const doc = await loadReviewDocument(session.user.id, session.user.role, id);
  if (doc.status !== "APPROVED") throw new Error("Chỉ tài liệu đã duyệt mới lưu trữ được");

  await prisma.document.update({ where: { id }, data: { status: "FILED" } });
  await audit({ userId: session.user.id, action: "DOCUMENT_FILE", targetType: "Document", targetId: id, detail: documentAuditDetail(doc) });

  revalidateMatter(doc.matterId);
  return { ok: true };
}
