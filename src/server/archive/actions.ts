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

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { createNotification } from "@/server/notifications/create";
import { checklistForCategory, evaluateChecklist } from "@/lib/archive/checklists";
import type { MatterCategory } from "@prisma/client";
import { nextArchiveNo } from "@/lib/archive/archive-no";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanLeadMatter } from "@/lib/permissions";
import { renderArchiveCover, renderArchiveCatalog } from "./render";
import { archiveSubmitSchema, type ArchiveSubmitInput, CLOSED_REASON_CN } from "./schemas";

/**
 // v0.9.4 Lưu trữ: toàn bộ quy trình
 // 1. Phân quyền: chủ trì / hợp tác viên của vụ nộp đơn, ADMIN duyệt
 // 2. Kiểm tra checklist thiếu hạng mục bắt buộc → nếu có và không forceWithMissing thì từ chối
 // 3. Sinh archiveNo
 // 4. Render bìa hồ sơ vụ → vào thư mục hồ sơ ARCHIVE
 // 5. Render mục lục hồ sơ (bìa vừa sinh có thể chọn không đưa vào mục lục)
 // 6. Tạo ArchiveRecord
 *   7. Matter status=ARCHIVED + archivedAt + closedAt
 *   8. TimelineEvent + audit
 */
async function getArchiveSessionAndValidate(input: ArchiveSubmitInput) {
  const session = await requireSession();
  const data = archiveSubmitSchema.parse(input);
  await assertMatterWritable(data.matterId);
  await assertCanLeadMatter(session.user.id, data.matterId, "Chỉ chủ trì / hợp tác viên của vụ mới được gửi yêu cầu lưu trữ");
  return { session, data };
}

async function getMatterForArchive(matterId: string) {
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: { id: true, status: true, category: true, internalCode: true, title: true }
  }) as { id: string; status: string; category: MatterCategory; internalCode: string; title: string } | null;
  if (!matter) throw new Error("Vụ án không tồn tại");
  if (matter.status === "ARCHIVED") throw new Error("Vụ án đã được lưu trữ");
  return matter;
}

function computeMissingItems(matterCategory: MatterCategory, checklistData: Record<string, boolean>, forceWithMissing: boolean) {
  const checklist = checklistForCategory(matterCategory);
  const { missingRequired } = evaluateChecklist(checklist, checklistData);
  if (missingRequired.length > 0 && !forceWithMissing) {
    throw new Error(
      `Danh mục lưu trữ thiếu ${missingRequired.length} hạng mục bắt buộc: ${missingRequired.map((x) => x.label).join(", ")}. Nếu xác nhận ép buộc lưu trữ, vui lòng tick ô "Ép buộc lưu trữ".`
    );
  }
  return missingRequired.map((x) => x.id);
}

interface ArchiveExtras {
  archiveNo: string;
  summary: string;
  judgmentSummary: string | undefined;
  closedReason: ArchiveSubmitInput["closedReason"];
  completedAt: Date;
  archivedAt: Date;
  checklist: Record<string, boolean>;
  coverDocId?: string;
  catalogDocId?: string;
}

async function renderArchiveDocuments(matterId: string, userId: string, extras: ArchiveExtras) {
  const coverDocId = await renderArchiveCover(prisma, { matterId, userId, extras });
  let catalogDocId: string;
  try {
    catalogDocId = await renderArchiveCatalog(prisma, {
      matterId,
      userId,
      extras,
      excludeDocIds: [coverDocId]
    });
  } catch (err) {
    await prisma.document.update({ where: { id: coverDocId }, data: { deletedAt: new Date() } }).catch(() => null);
    throw new Error(`Render mục lục hồ sơ thất bại: ${err instanceof Error ? err.message : String(err)}`);
  }
  return { coverDocId, catalogDocId };
}

function buildArchiveRecordData(matter: any, extras: ArchiveExtras, session: any, missingItems: string[]) {
  return {
    matterId: matter.id,
    archiveNo: extras.archiveNo,
    summary: extras.summary,
    judgmentSummary: extras.judgmentSummary || null,
    closedReason: extras.closedReason,
    completedAt: extras.completedAt,
    checklistJson: extras.checklist as Prisma.InputJsonValue,
    missingItems,
    coverDocId: extras.coverDocId!,
    catalogDocId: extras.catalogDocId!,
    archivedBy: session.user.name ?? session.user.id,
    archivedById: session.user.id,
    status: "PENDING_REVIEW" as const,
    reviewedById: null,
    reviewedAt: null
  };
}

function buildTimelineEventData(matterId: string, extras: ArchiveExtras) {
  return {
    matterId,
    eventType: "MATTER_ARCHIVE_REQUESTED" as const,
    title: `Đã gửi yêu cầu lưu trữ (${extras.archiveNo}, chờ duyệt)`,
    content: `Hình thức kết thúc: ${CLOSED_REASON_CN[extras.closedReason]}. ${extras.summary}`,
    occurredAt: extras.archivedAt
  };
}

async function createArchiveInTx(tx: any, matter: any, session: any, extras: ArchiveExtras, missingItems: string[]) {
  await tx.archiveRecord.create({ data: buildArchiveRecordData(matter, extras, session, missingItems) });
  await tx.timelineEvent.create({ data: buildTimelineEventData(matter.id, extras) });
  return extras.archiveNo;
}

async function finalizeArchive(matterId: string, userId: string, archiveNo: string, closedReason: ArchiveSubmitInput["closedReason"], missingItems: string[], forceWithMissing: boolean) {
  await audit({
    userId,
    action: "MATTER_ARCHIVE",
    targetType: "Matter",
    targetId: matterId,
    detail: { archiveNo, closedReason, missingCount: missingItems.length, forced: forceWithMissing && missingItems.length > 0 }
  });
  revalidatePath(`/matters/${matterId}`);
  revalidatePath("/matters");
  revalidatePath("//archive");
}

export async function archiveMatter(input: ArchiveSubmitInput) {
  const { session, data } = await getArchiveSessionAndValidate(input);
  const matter = await getMatterForArchive(data.matterId);
  const now = new Date();
  const archiveNo = await nextArchiveNo(prisma, matter.category, now);
  const missingItems = computeMissingItems(matter.category, data.checklist, data.forceWithMissing);
  const extras: ArchiveExtras = { archiveNo, summary: data.summary, judgmentSummary: data.judgmentSummary || undefined, closedReason: data.closedReason, completedAt: data.completedAt, archivedAt: now, checklist: data.checklist };
  const { coverDocId, catalogDocId } = await renderArchiveDocuments(matter.id, session.user.id, extras);
  extras.coverDocId = coverDocId; extras.catalogDocId = catalogDocId;
  await prisma.$transaction(async (tx) => { await createArchiveInTx(tx, matter, session, extras, missingItems); });
  await finalizeArchive(matter.id, session.user.id, archiveNo, data.closedReason, missingItems, data.forceWithMissing);
  return { ok: true, archiveNo, status: "PENDING_REVIEW" };
}

/**
 // v0.16: Quản trị duyệt qua yêu cầu lưu trữ (PENDING_REVIEW → APPROVED)
 */
async function findArchiveRecord(archiveId: string, sessionUserId: string) {
  const record = await prisma.archiveRecord.findUnique({
    where: { id: archiveId },
    select: { id: true, matterId: true, status: true, completedAt: true, archiveNo: true, archivedById: true }
  });
  if (!record) throw new Error("Bản ghi lưu trữ không tồn tại");
  if (record.status !== "PENDING_REVIEW") throw new Error("Yêu cầu lưu trữ này đã được duyệt");
  if (record.archivedById === sessionUserId) throw new Error("Bạn không thể duyệt yêu cầu của chính mình");
  return record;
}

function buildApprovalUpdateData(reviewedById: string, reviewedAt: Date, note?: string) {
  return { status: "APPROVED" as const, reviewedById, reviewedAt, reviewNote: note?.trim() || null };
}

function buildMatterUpdateData(archivedAt: Date, closedAt: Date | null) {
  return { status: "ARCHIVED" as const, archivedAt, closedAt: closedAt ?? archivedAt };
}

function buildApprovalTimelineEvent(matterId: string, archiveNo: string, note?: string, occurredAt: Date = new Date()) {
  return {
    matterId,
    eventType: "MATTER_ARCHIVED" as const,
    title: `Vụ án đã lưu trữ (${archiveNo})`,
    content: note?.trim() ? `Quản trị duyệt: ${note.trim()}` : "Quản trị duyệt qua",
    occurredAt
  };
}

async function notifyApplicant(record: any, matter: { title?: string; internalCode?: string } | null, sessionUserId: string) {
  if (!record.archivedById || record.archivedById === sessionUserId) return;
  await createNotification({
    userId: record.archivedById,
    type: "ARCHIVE_APPROVED",
    priority: "NORMAL",
    title: `Yêu cầu lưu trữ đã được duyệt (${record.archiveNo})`,
    content: `Yêu cầu lưu trữ của vụ ${matter?.internalCode ?? record.matterId}·${matter?.title ?? ""} đã được quản trị phê duyệt.`,
    href: `/matters/${record.matterId}`,
    refType: "ArchiveRecord",
    refId: record.id
  });
}

export async function approveArchiveRecord(input: { archiveId: string; note?: string }) {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") throw new Error("Chỉ quản trị mới được duyệt yêu cầu lưu trữ");
  const record = await findArchiveRecord(input.archiveId, session.user.id);
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.archiveRecord.update({ where: { id: record.id }, data: buildApprovalUpdateData(session.user.id, now, input.note) });
    await tx.matter.update({ where: { id: record.matterId }, data: buildMatterUpdateData(now, record.completedAt) });
    await tx.timelineEvent.create({ data: buildApprovalTimelineEvent(record.matterId, record.archiveNo, input.note, now) });
  });
  const matter = await prisma.matter.findUnique({ where: { id: record.matterId }, select: { title: true, internalCode: true } });
  await notifyApplicant(record, matter, session.user.id);
  await audit({ userId: session.user.id, action: "ARCHIVE_APPROVE", targetType: "ArchiveRecord", targetId: record.id, detail: { matterId: record.matterId, archiveNo: record.archiveNo } });
  revalidatePath(`/matters/${record.matterId}`);
  revalidatePath("/matters");
  revalidatePath("/archive");
  return { ok: true };
}

async function findRejectRecord(archiveId: string, sessionUserId: string) {
  const record = await prisma.archiveRecord.findUnique({
    where: { id: archiveId },
    select: { id: true, matterId: true, status: true, archiveNo: true, archivedById: true }
  });
  if (!record) throw new Error("Bản ghi lưu trữ không tồn tại");
  if (record.status !== "PENDING_REVIEW") throw new Error("Yêu cầu lưu trữ này đã được duyệt");
  return record;
}

function buildRejectUpdateData(reviewedById: string, note: string) {
  return { status: "REJECTED" as const, reviewedById, reviewedAt: new Date(), reviewNote: note.trim() };
}

async function notifyRejection(record: any, matter: { title?: string; internalCode?: string } | null, sessionUserId: string, note: string) {
  if (!record.archivedById || record.archivedById === sessionUserId) return;
  await createNotification({
    userId: record.archivedById,
    type: "ARCHIVE_REJECTED",
    priority: "HIGH",
    title: `Yêu cầu lưu trữ bị từ chối (${record.archiveNo})`,
    content: `Yêu cầu lưu trữ của vụ ${matter?.internalCode ?? record.matterId}·${matter?.title ?? ""} đã bị từ chối. Lý do: ${note}`,
    href: `/matters/${record.matterId}`,
    refType: "ArchiveRecord",
    refId: record.id
  });
}

export async function rejectArchiveRecord(input: { archiveId: string; note: string }) {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") throw new Error("Chỉ quản trị mới được từ chối yêu cầu lưu trữ");
  if (!input.note.trim()) throw new Error("Vui lòng nhập lý do từ chối");
  const record = await findRejectRecord(input.archiveId, session.user.id);
  await prisma.archiveRecord.update({ where: { id: record.id }, data: buildRejectUpdateData(session.user.id, input.note) });
  const matter = await prisma.matter.findUnique({ where: { id: record.matterId }, select: { title: true, internalCode: true } });
  await notifyRejection(record, matter, session.user.id, input.note);
  await audit({ userId: session.user.id, action: "ARCHIVE_REJECT", targetType: "ArchiveRecord", targetId: record.id, detail: { matterId: record.matterId, archiveNo: record.archiveNo, note: input.note.trim() } });
  revalidatePath(`/matters/${record.matterId}`);
  revalidatePath("/archive");
  return { ok: true };
}

/**
 // Lấy dữ liệu chuẩn bị lưu trữ của vụ: mẫu checklist hiện tại + ArchiveRecord đã có (nếu có)
 */
export async function getArchivePrepData(matterId: string) {
  const session = await requireSession();
  await assertCanLeadMatter(session.user.id, matterId, "Chỉ chủ trì / hợp tác viên của vụ mới được chuẩn bị lưu trữ");
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: {
      id: true,
      title: true,
      internalCode: true,
      category: true,
      status: true,
      closedAt: true,
      archivedAt: true,
      archiveRecords: {
        orderBy: { archivedAt: "desc" },
        take: 1,
        select: {
          archiveNo: true,
          summary: true,
          judgmentSummary: true,
          closedReason: true,
          completedAt: true,
          checklistJson: true,
          missingItems: true,
          coverDocId: true,
          catalogDocId: true,
          archivedBy: true,
          archivedAt: true
        }
      }
    }
  });
  if (!matter) throw new Error("Vụ án không tồn tại");

  const checklist = checklistForCategory(matter.category);

  // v0.11: Lấy content của sự kiện kết thúc gần nhất để điền sẵn phần tóm tắt
  const lastCloseEvent = await prisma.timelineEvent.findFirst({
    where: { matterId, eventType: "MATTER_CLOSED" },
    orderBy: { occurredAt: "desc" },
    select: { content: true }
  });

  // v0.17: Tài liệu đã tải lên và liên kết tới checklist item (dùng để trình hướng dẫn tự tích chọn)
  const linkedDocs = await prisma.document.findMany({
    where: {
      matterId,
      deletedAt: null,
      archiveChecklistItemId: { not: null }
    },
    select: {
      id: true,
      name: true,
      archiveChecklistItemId: true,
      createdAt: true
    },
    orderBy: { createdAt: "desc" }
  });

  // itemId → danh sách tài liệu liên kết (giữ toàn bộ; UI hiện bản đầu tiên + số còn lại)
  const docsByItem: Record<string, { id: string; name: string }[]> = {};
  for (const d of linkedDocs) {
    const key = d.archiveChecklistItemId!;
    (docsByItem[key] ??= []).push({ id: d.id, name: d.name });
  }

  return {
    matter,
    checklist,
    existingSummary: lastCloseEvent?.content ?? null,
    docsByItem
  };
}

/**
 // Danh sách vụ đã lưu trữ (trang tổng quan /archive) —— chỉ status=APPROVED
 */
export async function listArchivedMatters() {
  await requireSession();
  return prisma.archiveRecord.findMany({
    where: { status: "APPROVED" },
    orderBy: { archivedAt: "desc" },
    take: 200,
    select: {
      id: true,
      archiveNo: true,
      summary: true,
      closedReason: true,
      completedAt: true,
      archivedAt: true,
      archivedBy: true,
      missingItems: true,
      matter: {
        select: {
          id: true,
          title: true,
          internalCode: true,
          firmCaseNo: true,
          category: true,
          primaryClient: { select: { name: true } }
        }
      }
    }
  });
}

/**
 // v0.17: Danh sách yêu cầu lưu trữ chờ duyệt (chỉ ADMIN)
 // Dùng cho tab "Chờ duyệt" ở /archive
 */
export async function listPendingArchiveRecords() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("Chỉ quản trị mới xem được danh sách lưu trữ chờ duyệt");
  }
  return prisma.archiveRecord.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { archivedAt: "asc" },
    take: 200,
    select: {
      id: true,
      archiveNo: true,
      summary: true,
      judgmentSummary: true,
      closedReason: true,
      completedAt: true,
      archivedAt: true,
      archivedBy: true,
      missingItems: true,
      checklistJson: true,
      matter: {
        select: {
          id: true,
          title: true,
          internalCode: true,
          firmCaseNo: true,
          category: true,
          primaryClient: { select: { name: true } }
        }
      }
    }
  });
}

/**
 // v0.18: Luật sư tra cứu các yêu cầu lưu trữ của mình đã bị từ chối
 // Dùng cho lối vào "Lưu trữ của tôi đã bị từ chối" hoặc banner ở trang chi tiết vụ
 */
export async function listRejectedArchiveRecords() {
  const session = await requireSession();
  return prisma.archiveRecord.findMany({
    where: {
      archivedById: session.user.id,
      status: "REJECTED"
    },
    orderBy: { archivedAt: "desc" },
    take: 100,
    select: {
      id: true,
      archiveNo: true,
      matterId: true,
      summary: true,
      reviewedAt: true,
      reviewNote: true,
      matter: {
        select: {
          id: true,
          title: true,
          internalCode: true,
          status: true,
          archivedAt: true
        }
      }
    }
  });
}

/**
 // v0.18: Lấy ArchiveRecord mới nhất của vụ (mọi trạng thái)
 // Dùng để hiện banner trạng thái "Đang lưu trữ / Đã bị từ chối" ở trang chi tiết vụ
 */
export async function getLatestArchiveRecord(matterId: string) {
  await requireSession();
  return prisma.archiveRecord.findFirst({
    where: { matterId },
    orderBy: { archivedAt: "desc" },
    select: {
      id: true,
      archiveNo: true,
      status: true,
      archivedAt: true,
      reviewedAt: true,
      reviewNote: true,
      archivedBy: true,
      missingItems: true
    }
  });
}

/**
 // v0.20: Duyệt theo lô —— Duyệt qua
 *
 // Mỗi bản ghi xử lý độc lập (không bắt buộc nguyên tử), lần lượt dùng lại giao dịch của approveArchiveRecord.
 // Trả về { succeeded, failed }; failed chứa lý do lỗi để hiển thị trường hợp lỗi một phần.
 */
export async function batchApproveArchiveRecords(input: {
  archiveIds: string[];
  note?: string;
}): Promise<{
  succeeded: string[];
  failed: { id: string; error: string }[];
}> {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("Chỉ quản trị mới được duyệt yêu cầu lưu trữ");
  }
  if (!input.archiveIds.length) throw new Error("Chưa chọn yêu cầu lưu trữ nào");
  if (input.archiveIds.length > 100) throw new Error("Mỗi lần xử lý lô không quá 100 bản ghi");

  const succeeded: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const id of input.archiveIds) {
    try {
      await approveArchiveRecord({ archiveId: id, note: input.note });
      succeeded.push(id);
    } catch (err) {
      failed.push({ id, error: err instanceof Error ? err.message : "Lỗi không xác định" });
    }
  }
  await audit({
    userId: session.user.id,
    action: "ARCHIVE_BATCH_APPROVE",
    targetType: "ArchiveRecord",
    targetId: input.archiveIds.join(","),
    detail: {
      total: input.archiveIds.length,
      succeeded: succeeded.length,
      failed: failed.length
    }
  });
  return { succeeded, failed };
}

/**
 // v0.20: Duyệt theo lô —— Từ chối (dùng chung một lý do)
 */
export async function batchRejectArchiveRecords(input: {
  archiveIds: string[];
  note: string;
}): Promise<{
  succeeded: string[];
  failed: { id: string; error: string }[];
}> {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("Chỉ quản trị mới được từ chối yêu cầu lưu trữ");
  }
  if (!input.archiveIds.length) throw new Error("Chưa chọn yêu cầu lưu trữ nào");
  if (input.archiveIds.length > 100) throw new Error("Mỗi lần xử lý lô không quá 100 bản ghi");
  if (!input.note.trim()) throw new Error("Vui lòng nhập lý do từ chối");

  const succeeded: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const id of input.archiveIds) {
    try {
      await rejectArchiveRecord({ archiveId: id, note: input.note });
      succeeded.push(id);
    } catch (err) {
      failed.push({ id, error: err instanceof Error ? err.message : "Lỗi không xác định" });
    }
  }
  await audit({
    userId: session.user.id,
    action: "ARCHIVE_BATCH_REJECT",
    targetType: "ArchiveRecord",
    targetId: input.archiveIds.join(","),
    detail: {
      total: input.archiveIds.length,
      succeeded: succeeded.length,
      failed: failed.length,
      note: input.note.trim()
    }
  });
  return { succeeded, failed };
}
