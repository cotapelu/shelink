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
 * v0.27: Quét nhắc thời hạn đến hạn
 * v0.38: Thêm nhắc phiên tòa (bảng Hearing)
 *
 * Chạy mỗi ngày 09:00 (Asia/Ho_Chi_Minh), phủ Deadline / Hearing:
 * - Deadline: mỗi mục chưa hoàn tất có dueAt rơi vào T-3 / T-1 / T / T+1 gửi một thông báo
 * - Hearing: mục có startsAt rơi vào T-3 / T-1 / T (phiên tòa đã qua không nhắc, không gồm T+1), nội dung kèm giờ mở phiên cụ thể
 * - Người nhận: Deadline/Hearing → procedure.matter.ownerId
 * - Chống trùng: refType="DueReminder:Deadline:-3"... + refId ID thực thể + đã gửi trong ngày thì không gửi lại
 *
 * Lý do nghiệp vụ: trước v0.26 không có cơ chế "quét đến hạn gửi nhắc", khiến thời hạn trả lời, thời hạn chứng minh luật sư đặt đến lúc không réo;
 * Yêu cầu người dùng v0.38: có giờ mở phiên cụ thể thì chủ động nhắc trước phiên (trước 3 ngày/1 ngày/sáng hôm đó).
 */
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/server/notifications/create";
import { audit } from "@/server/audit";

const OFFSETS = [-3, -1, 0, 1] as const;
type Offset = (typeof OFFSETS)[number];

export type DueReminderScanResult = {
  deadlineScanned: number;
  deadlineNotified: number;
  hearingScanned: number;
  hearingNotified: number;
  suppressed: number;
};

function startOfLocalDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfLocalDay(d: Date) {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function offsetKey(offset: Offset) {
  return `DueReminder:${offset >= 0 ? "+" : ""}${offset}`;
}

function priorityFor(offset: Offset) {
  if (offset >= 1) return "URGENT";
  if (offset === 0) return "HIGH";
  if (offset === -1) return "HIGH";
  return "NORMAL";
}

function stateText(offset: Offset) {
  if (offset > 0) return `Quá hạn ${offset} ngày`;
  if (offset === 0) return "Đến hạn hôm nay";
  return `Còn ${-offset} ngày nữa đến hạn`;
}

// Riêng phiên tòa: thêm tiền tố "hôm nay/ngày mai/X ngày nữa" + giờ phút cụ thể (phiên tòa chính xác tới phút, khác thời hạn chỉ tới ngày)
function hearingWhenText(offset: Offset, startsAt: Date) {
  const hh = String(startsAt.getHours()).padStart(2, "0");
  const mm = String(startsAt.getMinutes()).padStart(2, "0");
  const day = offset === 0 ? "Hôm nay" : offset === -1 ? "Ngày mai" : `${-offset} ngày nữa`;
  return `${day} ${hh}:${mm} mở phiên tòa`;
}

async function fetchDeadlines(offset: Offset, dayStart: Date, dayEnd: Date) {
  return prisma.deadline.findMany({
    where: { completed: false, dueAt: { gte: dayStart, lte: dayEnd } },
    select: {
      id: true,
      title: true,
      dueAt: true,
      procedure: {
        select: {
          id: true,
          matter: { select: { id: true, title: true, internalCode: true, ownerId: true } }
        }
      }
    }
  });
}

async function notifySingleDeadline(d: any, offset: Offset, todayStart: Date): Promise<{ notified: boolean; suppressed: boolean }> {
  const userId = d.procedure.matter.ownerId;
  if (!userId) return { notified: false, suppressed: false };
  const refTypeDL = `${offsetKey(offset)}:Deadline`;
  const dup = await prisma.notification.findFirst({ where: { refType: refTypeDL, refId: d.id, createdAt: { gte: todayStart } }, select: { id: true } });
  if (dup) return { notified: false, suppressed: true };
  await createNotification({ userId, type: "DEADLINE_REMINDER", priority: priorityFor(offset), title: `${stateText(offset)}: ${d.title}`, content: `Vụ án ${d.procedure.matter.internalCode}·${d.procedure.matter.title}`, href: `/matters/${d.procedure.matter.id}`, refType: refTypeDL, refId: d.id });
  return { notified: true, suppressed: false };
}

async function processDeadlines(deadlines: any[], offset: Offset, todayStart: Date): Promise<{ notified: number; suppressed: number }> {
  let notified = 0, suppressed = 0;
  for (const d of deadlines) {
    const res = await notifySingleDeadline(d, offset, todayStart);
    notified += res.notified ? 1 : 0;
    suppressed += res.suppressed ? 1 : 0;
  }
  return { notified, suppressed };
}

async function scanDeadlinesForOffset(offset: Offset, dayStart: Date, dayEnd: Date, todayStart: Date): Promise<{ scanned: number; notified: number; suppressed: number }> {
  const deadlines = await fetchDeadlines(offset, dayStart, dayEnd);
  const { notified, suppressed } = await processDeadlines(deadlines, offset, todayStart);
  return { scanned: deadlines.length, notified, suppressed };
}

async function fetchHearings(offset: Offset, dayStart: Date, dayEnd: Date) {
  return prisma.hearing.findMany({
    where: { startsAt: { gte: dayStart, lte: dayEnd } },
    select: {
      id: true,
      title: true,
      startsAt: true,
      room: true,
      judge: true,
      procedure: { select: { matter: { select: { id: true, title: true, internalCode: true, ownerId: true } } } }
    }
  });
}

async function notifySingleHearing(h: any, offset: Offset, todayStart: Date): Promise<{ notified: boolean; suppressed: boolean }> {
  const userId = h.procedure.matter.ownerId;
  if (!userId) return { notified: false, suppressed: false };
  const refTypeHearing = `${offsetKey(offset)}:Hearing`;
  const dup = await prisma.notification.findFirst({ where: { refType: refTypeHearing, refId: h.id, createdAt: { gte: todayStart } }, select: { id: true } });
  if (dup) return { notified: false, suppressed: true };
  const place = [h.room && `${h.room}`, h.judge && `Thẩm phán ${h.judge}`].filter(Boolean).join(" · ");
  await createNotification({ userId, type: "HEARING_REMINDER", priority: priorityFor(offset), title: `${hearingWhenText(offset, h.startsAt)}: ${h.title}`, content: `Vụ án ${h.procedure.matter.internalCode}·${h.procedure.matter.title}${place ? ` · ${place}` : ""}`, href: `/matters/${h.procedure.matter.id}`, refType: refTypeHearing, refId: h.id });
  return { notified: true, suppressed: false };
}

async function processHearings(hearings: any[], offset: Offset, todayStart: Date): Promise<{ notified: number; suppressed: number }> {
  let notified = 0, suppressed = 0;
  for (const h of hearings) {
    const res = await notifySingleHearing(h, offset, todayStart);
    notified += res.notified ? 1 : 0;
    suppressed += res.suppressed ? 1 : 0;
  }
  return { notified, suppressed };
}

async function scanHearingsForOffset(offset: Offset, dayStart: Date, dayEnd: Date, todayStart: Date): Promise<{ scanned: number; notified: number; suppressed: number }> {
  const hearings = await fetchHearings(offset, dayStart, dayEnd);
  const { notified, suppressed } = await processHearings(hearings, offset, todayStart);
  return { scanned: hearings.length, notified, suppressed };
}

async function processOneOffset(offset: Offset, todayStart: Date, now: Date): Promise<Partial<DueReminderScanResult>> {
  const target = new Date(now); target.setDate(target.getDate() + offset);
  const dayStart = startOfLocalDay(target); const dayEnd = endOfLocalDay(target);
  const deadlineStats = await scanDeadlinesForOffset(offset, dayStart, dayEnd, todayStart);
  const hearingStats = offset <= 0 ? await scanHearingsForOffset(offset, dayStart, dayEnd, todayStart) : null;
  return { deadlineScanned: deadlineStats.scanned, deadlineNotified: deadlineStats.notified, hearingScanned: hearingStats?.scanned ?? 0, hearingNotified: hearingStats?.notified ?? 0, suppressed: deadlineStats.suppressed + (hearingStats?.suppressed ?? 0) };
}

export async function scanDueReminders(): Promise<DueReminderScanResult> {
  const now = new Date(); const todayStart = startOfLocalDay(now);
  const result = { deadlineScanned: 0, deadlineNotified: 0, hearingScanned: 0, hearingNotified: 0, suppressed: 0 };
  for (const offset of OFFSETS) {
    const stats = await processOneOffset(offset, todayStart, now);
    result.deadlineScanned += stats.deadlineScanned!; result.deadlineNotified += stats.deadlineNotified!; result.hearingScanned += stats.hearingScanned!; result.hearingNotified += stats.hearingNotified!; result.suppressed += stats.suppressed!;
  }
  await audit({ userId: null, action: "DUE_REMINDER_SCAN_CRON", targetType: "Report", targetId: "due-reminder", detail: { deadlineScanned: result.deadlineScanned, deadlineNotified: result.deadlineNotified, hearingScanned: result.hearingScanned, hearingNotified: result.hearingNotified, suppressed: result.suppressed, offsets: OFFSETS } });
  return result;
}
