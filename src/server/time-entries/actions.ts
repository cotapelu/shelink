/*
 * Server actions module Ghi giờ (DATA-MODEL §4.30).
 * User chỉ sửa/xoá/gửi entry DRAFT của mình; duyệt: ADMIN/OWNER/MANAGER.
 */

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertManagerOrRole } from "@/lib/permissions";
import {
  timeApproveSchema,
  timeEntryCreateSchema,
  timeEntryIdSchema,
  timeEntryListFilterSchema,
  timeEntryUpdateSchema,
  timeSubmitSchema
} from "./schemas";

type Actor = { id: string; role: string };
const MANAGERS = ["ADMIN", "OWNER", "MANAGER"];

function isManager(actor: Actor) {
  return MANAGERS.includes(actor.role);
}

function linkFields(v: { matterId?: string; legalTaskId?: string; workTaskId?: string; projectId?: string }) {
  return {
    matterId: v.matterId || null,
    legalTaskId: v.legalTaskId || null,
    workTaskId: v.workTaskId || null,
    projectId: v.projectId || null
  };
}

function timeEntryWhere(filter: z.infer<typeof timeEntryListFilterSchema>, actor: Actor) {
  const mine = filter.scope === "mine" || !isManager(actor);
  return {
    ...(mine ? { userId: actor.id } : {}),
    ...(filter.userId ? { userId: filter.userId } : {}),
    ...(filter.matterId ? { matterId: filter.matterId } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.from || filter.to ? { date: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } } : {})
  };
}

export async function listMyTimeEntries(input?: z.input<typeof timeEntryListFilterSchema>) {
  const session = await requireSession();
  const filter = timeEntryListFilterSchema.parse(input ?? {});
  return prisma.timesheetEntry.findMany({
    where: timeEntryWhere(filter, session.user),
    include: {
      matter: { select: { id: true, title: true, internalCode: true } },
      workTask: { select: { id: true, title: true } },
      user: { select: { id: true, name: true } }
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 500
  });
}

export async function createTimeEntry(input: z.input<typeof timeEntryCreateSchema>) {
  const session = await requireSession();
  const data = timeEntryCreateSchema.parse(input);

  const entry = await prisma.timesheetEntry.create({
    data: {
      userId: session.user.id,
      date: data.date,
      hours: data.hours,
      billable: data.billable,
      activityType: data.activityType,
      description: data.description,
      ...linkFields(data)
    }
  });

  await audit({ userId: session.user.id, action: "CREATE", targetType: "TimesheetEntry", targetId: entry.id });
  revalidatePath("/time-tracking");
  return entry;
}

export async function updateTimeEntry(input: z.input<typeof timeEntryUpdateSchema>) {
  const session = await requireSession();
  const data = timeEntryUpdateSchema.parse(input);
  const entry = await loadOwnedDraft(data.id, session.user);

  await prisma.timesheetEntry.update({
    where: { id: data.id },
    data: {
      date: data.date,
      hours: data.hours,
      billable: data.billable,
      activityType: data.activityType,
      description: data.description,
      ...linkFields(data)
    }
  });
  await audit({ userId: session.user.id, action: "UPDATE", targetType: "TimesheetEntry", targetId: entry.id });
  revalidatePath("/time-tracking");
}

export async function deleteTimeEntry(id: string) {
  const session = await requireSession();
  const { id: entryId } = timeEntryIdSchema.parse({ id });
  await loadOwnedDraft(entryId, session.user);
  await prisma.timesheetEntry.delete({ where: { id: entryId } });
  await audit({ userId: session.user.id, action: "DELETE", targetType: "TimesheetEntry", targetId: entryId });
  revalidatePath("/time-tracking");
}

export async function submitTimeEntries(input: z.input<typeof timeSubmitSchema>) {
  const session = await requireSession();
  const data = timeSubmitSchema.parse(input);
  await prisma.timesheetEntry.updateMany({
    where: { id: { in: data.ids }, userId: session.user.id, status: "DRAFT" },
    data: { status: "SUBMITTED" }
  });
  await audit({ userId: session.user.id, action: "SUBMIT", targetType: "TimesheetEntry", detail: { count: data.ids.length } });
  revalidatePath("/time-tracking");
}

export async function approveTimeEntries(input: z.input<typeof timeApproveSchema>) {
  const session = await requireSession();
  assertManagerOrRole(session.user.role, ...MANAGERS);
  const data = timeApproveSchema.parse(input);
  await prisma.timesheetEntry.updateMany({
    where: { id: { in: data.ids }, status: "SUBMITTED" },
    data: { status: "APPROVED", approvedById: session.user.id, approvedAt: new Date() }
  });
  await audit({ userId: session.user.id, action: "APPROVE", targetType: "TimesheetEntry", detail: { count: data.ids.length } });
  revalidatePath("/time-tracking");
}

export async function rejectTimeEntries(input: z.input<typeof timeApproveSchema>) {
  const session = await requireSession();
  assertManagerOrRole(session.user.role, ...MANAGERS);
  const data = timeApproveSchema.parse(input);
  await prisma.timesheetEntry.updateMany({
    where: { id: { in: data.ids }, status: "SUBMITTED" },
    data: { status: "REJECTED", approvedById: session.user.id, rejectNote: data.rejectNote, approvedAt: new Date() }
  });
  await audit({ userId: session.user.id, action: "REJECT", targetType: "TimesheetEntry", detail: { count: data.ids.length } });
  revalidatePath("/time-tracking");
}

async function loadOwnedDraft(id: string, actor: Actor) {
  const entry = await prisma.timesheetEntry.findUnique({ where: { id } });
  if (!entry) throw new Error("[ERROR] TimeEntry - bản ghi giờ không tồn tại");
  if (entry.userId !== actor.id && !isManager(actor)) {
    throw new Error("[ERROR] TimeEntry Permission - chỉ sửa ghi giờ của chính mình - liên hệ quản lý nếu cần");
  }
  if (entry.status !== "DRAFT") throw new Error("[ERROR] TimeEntry - chỉ sửa bản ghi ở trạng thái nháp - đã gửi duyệt");
  return entry;
}
