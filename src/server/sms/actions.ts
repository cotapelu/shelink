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
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { createNotification } from "@/server/notifications/create";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanAccessMatter, assertCanAssociateMatter } from "@/lib/permissions";
import { parseSms, splitSmsBatch, toDate, type ParsedSms } from "@/lib/sms-parser";
import { enrichWithAi } from "@/lib/sms-parser-ai";
import {
  smsParseAndSaveSchema,
  smsListFilterSchema,
  smsMatchToMatterSchema,
  smsGenerateHearingSchema,
  smsGenerateDeadlineSchema,
  smsIdSchema
} from "./schemas";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Phân tích và lưu (hỗ trợ nhiều bản ghi)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function findMatchingMatter(caseNumbers: string[]): Promise<string | null> {
  if (caseNumbers.length === 0) return null;
  const proc = await prisma.matterProcedure.findFirst({
    where: {
      caseNumber: { in: caseNumbers },
      matter: { deletedAt: null }
    },
    select: { matterId: true }
  });
  return proc?.matterId ?? null;
}

export async function parseAndSaveSms(input: z.infer<typeof smsParseAndSaveSchema>) {
  const session = await requireSession();
  const data = smsParseAndSaveSchema.parse(input);

  const messages = data.batch ? splitSmsBatch(data.rawText) : [data.rawText.trim()];
  if (messages.length === 0) throw new Error("Không có nội dung nào để phân tích");

  const createdIds: string[] = [];

  let aiEnrichedCount = 0;
  for (const text of messages) {
    let parsed: ParsedSms = parseSms(text);
    if (data.useAi) {
      parsed = await enrichWithAi(text, parsed);
      if (parsed.aiEnriched) aiEnrichedCount++;
    }
    const matchedMatterId = await findMatchingMatter(parsed.caseNumbers);

    const created = await prisma.smsMessage.create({
      data: {
        rawText: text,
        receivedById: session.user.id,
        parsedJson: parsed as unknown as Prisma.InputJsonValue,
        smsType: parsed.smsType,
        matchedMatterId,
        matchedBy: matchedMatterId ? "AUTO_CASE_NUMBER" : "UNMATCHED"
      },
      select: { id: true }
    });
    createdIds.push(created.id);

    // Thông báo cho người phụ trách vụ án liên kết
    if (matchedMatterId) {
      const matter = await prisma.matter.findUnique({
        where: { id: matchedMatterId },
        select: { ownerId: true }
      });
      if (matter && matter.ownerId !== session.user.id) {
        await createNotification({
          userId: matter.ownerId,
          type: "SMS_ARRIVAL",
          title: "Nhận tin nhắn mới từ toà án",
          content: `Vụ án có tin nhắn mới từ toà án, loại: ${parsed.smsType ?? "Không rõ"}`,
          href: "/inbox",
          refType: "SmsMessage",
          refId: created.id
        });
      }
    }
  }

  await audit({
    userId: session.user.id,
    action: "SMS_PARSE_SAVE",
    targetType: "SmsMessage",
    targetId: createdIds.join(","),
    detail: { count: createdIds.length, batch: data.batch, useAi: data.useAi, aiEnrichedCount }
  });

  revalidatePath("/inbox");
  return { ok: true, ids: createdIds, count: createdIds.length, aiEnrichedCount };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Danh sách
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function listSmsMessages(input?: z.input<typeof smsListFilterSchema>) {
  const session = await requireSession();
  const filter = smsListFilterSchema.parse(input ?? {});

  const where: Prisma.SmsMessageWhereInput = {};
  if (filter.scope === "mine") where.receivedById = session.user.id;
  if (filter.processed === "unprocessed") where.processed = false;
  if (filter.processed === "processed") where.processed = true;
  if (filter.smsType) where.smsType = filter.smsType;

  return prisma.smsMessage.findMany({
    where,
    orderBy: [{ processed: "asc" }, { receivedAt: "desc" }],
    include: {
      receivedBy: { select: { id: true, name: true } },
      matchedMatter: {
        select: {
          id: true,
          internalCode: true,
          title: true,
          procedures: {
            where: { engagement: "ENGAGED" },
            orderBy: { order: "asc" },
            select: { id: true, type: true, customLabel: true, caseNumber: true }
          }
        }
      }
    }
  });
}

export async function getSmsMessage(id: string) {
  await requireSession();
  return prisma.smsMessage.findUnique({
    where: { id },
    include: {
      receivedBy: { select: { id: true, name: true } },
      matchedMatter: {
        select: {
          id: true,
          internalCode: true,
          title: true,
          procedures: {
            where: { engagement: "ENGAGED" },
            orderBy: { order: "asc" },
            select: { id: true, type: true, customLabel: true, caseNumber: true }
          }
        }
      }
    }
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gán Matter thủ công
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function matchSmsToMatter(input: z.infer<typeof smsMatchToMatterSchema>) {
  const session = await requireSession();
  const data = smsMatchToMatterSchema.parse(input);
  if (data.matterId) {
    await assertCanAssociateMatter(session.user.id, data.matterId);
    await assertMatterWritable(data.matterId);
  }

  await prisma.smsMessage.update({
    where: { id: data.smsId },
    data: {
      matchedMatterId: data.matterId,
      matchedBy: data.matterId ? "MANUAL" : "UNMATCHED"
    }
  });

  await audit({
    userId: session.user.id,
    action: "SMS_MATCH_MATTER",
    targetType: "SmsMessage",
    targetId: data.smsId,
    detail: { matterId: data.matterId }
  });

  revalidatePath("/inbox");
  return { ok: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sinh Hearing một bấm
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function generateHearingFromSms(input: z.infer<typeof smsGenerateHearingSchema>) {
  const session = await requireSession();
  const data = smsGenerateHearingSchema.parse(input);

  const proc = await prisma.matterProcedure.findUnique({
    where: { id: data.procedureId },
    select: { id: true, matterId: true }
  });
  if (!proc) throw new Error("Thủ tục không tồn tại");
  await assertCanAccessMatter(session.user.id, session.user.role, proc.matterId);
  await assertMatterWritable(proc.matterId);

  const hearing = await prisma.hearing.create({
    data: {
      procedureId: data.procedureId,
      title: data.title.trim(),
      startsAt: data.startsAt,
      room: data.room?.trim() || null,
      judge: data.judge?.trim() || null,
      notes: data.notes?.trim() || null
    }
  });

  await prisma.smsMessage.update({
    where: { id: data.smsId },
    data: {
      generatedHearingId: hearing.id,
      processed: true,
      processedAt: new Date()
    }
  });

  await audit({
    userId: session.user.id,
    action: "SMS_GENERATE_HEARING",
    targetType: "Hearing",
    targetId: hearing.id,
    detail: { smsId: data.smsId, procedureId: data.procedureId }
  });

  revalidatePath("/inbox");
  revalidatePath(`/matters/${proc.matterId}`);
  return { ok: true, hearingId: hearing.id };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sinh Deadline một bấm
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function generateDeadlineFromSms(input: z.infer<typeof smsGenerateDeadlineSchema>) {
  const session = await requireSession();
  const data = smsGenerateDeadlineSchema.parse(input);

  const proc = await prisma.matterProcedure.findUnique({
    where: { id: data.procedureId },
    select: { id: true, matterId: true }
  });
  if (!proc) throw new Error("Thủ tục không tồn tại");
  await assertCanAccessMatter(session.user.id, session.user.role, proc.matterId);
  await assertMatterWritable(proc.matterId);

  const deadline = await prisma.deadline.create({
    data: {
      procedureId: data.procedureId,
      title: data.title.trim(),
      category: data.category,
      dueAt: data.dueAt,
      basis: data.basis?.trim() || null,
      remindDays: data.remindDays
    }
  });

  await prisma.smsMessage.update({
    where: { id: data.smsId },
    data: {
      generatedDeadlineId: deadline.id,
      processed: true,
      processedAt: new Date()
    }
  });

  await audit({
    userId: session.user.id,
    action: "SMS_GENERATE_DEADLINE",
    targetType: "Deadline",
    targetId: deadline.id,
    detail: { smsId: data.smsId, procedureId: data.procedureId }
  });

  revalidatePath("/inbox");
  revalidatePath(`/matters/${proc.matterId}`);
  return { ok: true, deadlineId: deadline.id };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Đánh dấu đã xử lý
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function markSmsProcessed(input: z.infer<typeof smsIdSchema>) {
  const session = await requireSession();
  const data = smsIdSchema.parse(input);

  await prisma.smsMessage.update({
    where: { id: data.id },
    data: { processed: true, processedAt: new Date() }
  });

  await audit({
    userId: session.user.id,
    action: "SMS_MARK_PROCESSED",
    targetType: "SmsMessage",
    targetId: data.id
  });

  revalidatePath("/inbox");
  return { ok: true };
}

export async function deleteSms(input: z.infer<typeof smsIdSchema>) {
  const session = await requireSession();
  const data = smsIdSchema.parse(input);

  const sms = await prisma.smsMessage.findUnique({
    where: { id: data.id },
    select: { receivedById: true }
  });
  if (!sms) throw new Error("Tin nhắn không tồn tại");
  if (sms.receivedById !== session.user.id && session.user.role !== "ADMIN") {
    throw new Error("Chỉ người nhận hoặc quản trị viên được xoá");
  }

  await prisma.smsMessage.delete({ where: { id: data.id } });

  await audit({
    userId: session.user.id,
    action: "SMS_DELETE",
    targetType: "SmsMessage",
    targetId: data.id
  });

  revalidatePath("/inbox");
  return { ok: true };
}

// Chuyển chuỗi ngày phân tích được sang JS Date (dùng để UI điền sẵn)
export async function parseDateString(s: string) {
  await requireSession();
  const d = toDate(s);
  return d ? d.toISOString() : null;
}
