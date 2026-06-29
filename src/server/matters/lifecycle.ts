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
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanLeadMatter } from "@/lib/permissions";

const closeMatterSchema = z.object({
  id: z.string().cuid(),
  summary: z.string().min(1, "Tóm tắt kết thúc vụ án bắt buộc").max(2000)
});

const holdMatterSchema = z.object({
  id: z.string().cuid(),
  reason: z.string().max(500).optional().or(z.literal(""))
});

export type CloseMatterInput = z.infer<typeof closeMatterSchema>;
export type HoldMatterInput = z.infer<typeof holdMatterSchema>;

/**
 * Kết thúc vụ án: Chuyển status sang CLOSED, lưu tóm tắt kết thúc vào TimelineEvent.
 * Không yêu cầu tất cả procedure phải concluded, luật sư tự quyết định.
 */
export async function closeMatter(input: CloseMatterInput) {
  const session = await requireSession();
  const data = closeMatterSchema.parse(input);
  await assertMatterWritable(data.id);
  await assertCanLeadMatter(session.user.id, data.id, "Chỉ luật sư phụ trách/assist được kết thúc vụ án");

  await prisma.$transaction(async (tx) => {
    await tx.matter.update({
      where: { id: data.id },
      data: {
        status: "CLOSED",
        closedAt: new Date()
      }
    });
    await tx.timelineEvent.create({
      data: {
        matterId: data.id,
        eventType: "MATTER_CLOSED",
        title: "Vụ án đã kết thúc",
        content: data.summary,
        occurredAt: new Date()
      }
    });
  });

  await audit({
    userId: session.user.id,
    action: "MATTER_CLOSE",
    targetType: "Matter",
    targetId: data.id,
    detail: { summaryLen: data.summary.length }
  });

  revalidatePath(`/matters/${data.id}`);
  revalidatePath("/matters");
  return { ok: true };
}

/**
 * Lưu trữ: Quy trình đầy đủ thấy ở src/server/archive/actions.ts → archiveMatter
 * Không còn giữ legacy lightweight version (từ v0.9.4 dùng ArchiveWizard thống nhất).
 */

/**
 * Mở lại (từ ON_HOLD / CLOSED về IN_PROGRESS).
 * Trạng thái ARCHIVED không thể mở lại (nếu cần ADMIN dùng path riêng).
 */
export async function reopenMatter(id: string) {
  const session = await requireSession();
  const matter = await prisma.matter.findUnique({ where: { id }, select: { status: true } });
  if (!matter) throw new Error("Vụ án không tồn tại");
  await assertMatterWritable(id);
  await assertCanLeadMatter(session.user.id, id, "Chỉ luật sư phụ trách/assist được mở lại vụ án");
  if (matter.status === "ARCHIVED") {
    throw new Error("Vụ án đã lưu trữ không thể mở lại");
  }

  await prisma.$transaction(async (tx) => {
    await tx.matter.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        closedAt: null
      }
    });
    await tx.timelineEvent.create({
      data: {
        matterId: id,
        eventType: "MATTER_REOPENED",
        title: "Vụ án đã được mở lại",
        occurredAt: new Date()
      }
    });
  });

  await audit({
    userId: session.user.id,
    action: "MATTER_REOPEN",
    targetType: "Matter",
    targetId: id
  });

  revalidatePath(`/matters/${id}`);
  revalidatePath("/matters");
  return { ok: true };
}

/**
 * Tạm dừng vụ án (khách hàng mất liên lạc, chờ bổ sung tài liệu...).
 */
export async function holdMatter(input: HoldMatterInput) {
  const session = await requireSession();
  const data = holdMatterSchema.parse(input);
  await assertMatterWritable(data.id);
  await assertCanLeadMatter(session.user.id, data.id, "Chỉ luật sư phụ trách/assist được tạm dừng vụ án");

  await prisma.$transaction(async (tx) => {
    await tx.matter.update({
      where: { id: data.id },
      data: { status: "ON_HOLD" }
    });
    await tx.timelineEvent.create({
      data: {
        matterId: data.id,
        eventType: "MATTER_ON_HOLD",
        title: "Vụ án đã tạm dừng",
        content: data.reason || undefined,
        occurredAt: new Date()
      }
    });
  });

  await audit({
    userId: session.user.id,
    action: "MATTER_HOLD",
    targetType: "Matter",
    targetId: data.id,
    detail: { reason: data.reason }
  });

  revalidatePath(`/matters/${data.id}`);
  revalidatePath("/matters");
  return { ok: true };
}
