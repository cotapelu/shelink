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
 * Server actions cho Vụ án bảo toàn (PreservationCase) — tách từ actions-v2.ts (AUTO-67c).
 * Chỉ giữ case CRUD; target/property ở preservation-property-actions.ts.
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanAssociateMatter, matterAssociationFilter } from "@/lib/permissions";
import {
  caseCreateSchema,
  caseUpdateSchema,
  caseListFilterSchema,
  deleteSchema
} from "./schemas-v2";
import {
  assertCanAccessPreservationCase,
  revalidatePreservationPaths
} from "./preservation-access";

const CASE_LIST_INCLUDE = {
  matter: { select: { id: true, internalCode: true, title: true } },
  owner: { select: { id: true, name: true } },
  targets: {
    include: {
      properties: {
        orderBy: { expiryDate: "asc" },
        include: { renewals: { orderBy: { renewedAt: "desc" }, take: 3 } }
      }
    },
    orderBy: { createdAt: "asc" }
  }
} satisfies Prisma.PreservationCaseInclude;

function caseAccessWhere(userId: string): Prisma.PreservationCaseWhereInput {
  return {
    OR: [
      { matter: { deletedAt: null, ...matterAssociationFilter(userId) } },
      { matterId: null, ownerId: userId }
    ]
  };
}

function caseSearchOr(search: string): Prisma.PreservationCaseWhereInput {
  return {
    OR: [
      { court: { contains: search, mode: "insensitive" } },
      { rulingNumber: { contains: search, mode: "insensitive" } },
      { matter: { title: { contains: search, mode: "insensitive" } } },
      { targets: { some: { name: { contains: search, mode: "insensitive" } } } }
    ]
  };
}

function caseListWhere(
  filter: z.infer<typeof caseListFilterSchema>,
  userId: string
): Prisma.PreservationCaseWhereInput {
  const accessWhere = caseAccessWhere(userId);
  const where: Prisma.PreservationCaseWhereInput = { AND: [accessWhere] };
  if (filter.status !== "ALL") where.status = filter.status;
  if (filter.matterId) where.matterId = filter.matterId;
  if (filter.search) {
    where.AND = [accessWhere, caseSearchOr(filter.search)];
  }
  return where;
}

export async function listPreservationCases(input?: z.input<typeof caseListFilterSchema>) {
  const session = await requireSession();
  const filter = caseListFilterSchema.parse(input ?? {});
  return prisma.preservationCase.findMany({
    where: caseListWhere(filter, session.user.id),
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: CASE_LIST_INCLUDE
  });
}

async function validateCaseMatterLink(userId: string, matterId: string) {
  const m = await prisma.matter.findUnique({ where: { id: matterId } });
  if (!m) throw new Error("Vụ án liên kết không tồn tại");
  await assertCanAssociateMatter(userId, matterId);
  await assertMatterWritable(matterId);
}

function firstPropertyCreate(data: z.infer<typeof caseCreateSchema>) {
  if (!data.firstPropertyType) return undefined;
  return {
    create: {
      propertyType: data.firstPropertyType,
      propertyDetail: data.firstPropertyDetail?.trim() || null,
      amount: data.firstAmount != null ? new Prisma.Decimal(data.firstAmount) : null,
      startDate: data.firstStartDate ?? new Date(),
      duration: data.firstDuration ?? 365,
      expiryDate: data.firstExpiryDate ?? new Date(Date.now() + 365 * 86400000),
      status: "ACTIVE" as const
    }
  };
}

function firstTargetCreate(data: z.infer<typeof caseCreateSchema>) {
  if (!data.firstTarget?.trim()) return undefined;
  return {
    create: { name: data.firstTarget.trim(), properties: firstPropertyCreate(data) }
  };
}

function caseTextData(data: z.infer<typeof caseCreateSchema>) {
  return {
    court: data.court?.trim() || null,
    rulingNumber: data.rulingNumber?.trim() || null,
    note: data.note?.trim() || null
  };
}

function caseScalarData(data: z.infer<typeof caseCreateSchema>) {
  return {
    matterId: data.matterId ?? null,
    type: data.type,
    guaranteeType: data.guaranteeType ?? null,
    appliedAt: data.appliedAt ?? null,
    ownerId: data.ownerId ?? null,
    remindDays: data.remindDays,
    status: "ACTIVE" as const,
    ...caseTextData(data)
  };
}

function caseCreateData(data: z.infer<typeof caseCreateSchema>) {
  return { ...caseScalarData(data), targets: firstTargetCreate(data) };
}

export async function createPreservationCase(input: z.infer<typeof caseCreateSchema>) {
  const session = await requireSession();
  const data = caseCreateSchema.parse(input);
  if (data.matterId) await validateCaseMatterLink(session.user.id, data.matterId);

  const created = await prisma.preservationCase.create({
    data: caseCreateData(data),
    select: { id: true, matterId: true }
  });

  await audit({ userId: session.user.id, action: "PRESERVATION_CASE_CREATE", targetType: "PreservationCase", targetId: created.id, detail: { type: data.type } });
  for (const path of revalidatePreservationPaths(created.matterId)) revalidatePath(path);
  return { ok: true, id: created.id };
}

function caseRelationPatch(data: z.infer<typeof caseUpdateSchema>): Prisma.PreservationCaseUpdateInput {
  const patch: Prisma.PreservationCaseUpdateInput = {};
  if (data.matterId !== undefined) {
    patch.matter = data.matterId ? { connect: { id: data.matterId } } : { disconnect: true };
  }
  if (data.ownerId !== undefined) {
    patch.owner = data.ownerId ? { connect: { id: data.ownerId } } : { disconnect: true };
  }
  return patch;
}

function trimOrNull(value: string | null | undefined) {
  return value?.trim() || null;
}

function caseTextPatch(data: z.infer<typeof caseUpdateSchema>): Prisma.PreservationCaseUpdateInput {
  const patch: Prisma.PreservationCaseUpdateInput = {};
  if (data.court !== undefined) patch.court = trimOrNull(data.court);
  if (data.rulingNumber !== undefined) patch.rulingNumber = trimOrNull(data.rulingNumber);
  if (data.note !== undefined) patch.note = trimOrNull(data.note);
  if (data.guaranteeType !== undefined) patch.guaranteeType = data.guaranteeType ?? null;
  return patch;
}

function caseUpdatePatch(data: z.infer<typeof caseUpdateSchema>): Prisma.PreservationCaseUpdateInput {
  const keys = ["id", "matterId", "court", "rulingNumber", "note", "ownerId", "guaranteeType"] as const;
  const rest: Record<string, unknown> = { ...data };
  for (const k of keys) delete rest[k];
  return { ...rest, ...caseRelationPatch(data), ...caseTextPatch(data) };
}

export async function updatePreservationCase(input: z.infer<typeof caseUpdateSchema>) {
  const session = await requireSession();
  const data = caseUpdateSchema.parse(input);

  const existing = await assertCanAccessPreservationCase(session.user.id, data.id);
  if (existing.matterId) await assertMatterWritable(existing.matterId);
  if (data.matterId) await validateCaseMatterLink(session.user.id, data.matterId);

  await prisma.preservationCase.update({ where: { id: data.id }, data: caseUpdatePatch(data) });

  await audit({
    userId: session.user.id,
    action: "PRESERVATION_CASE_UPDATE",
    targetType: "PreservationCase",
    targetId: data.id
  });

  for (const path of revalidatePreservationPaths(existing.matterId)) revalidatePath(path);
  return { ok: true };
}

export async function deletePreservationCase(input: z.infer<typeof deleteSchema>) {
  const session = await requireSession();
  const data = deleteSchema.parse(input);
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("Chỉ quản trị viên hoặc luật sư chính được xoá bản ghi bảo toàn");
  }

  const cs = await assertCanAccessPreservationCase(session.user.id, data.id);
  if (cs.matterId) await assertMatterWritable(cs.matterId);

  await prisma.preservationCase.delete({ where: { id: data.id } });
  await audit({ userId: session.user.id, action: "PRESERVATION_CASE_DELETE", targetType: "PreservationCase", targetId: data.id });
  for (const path of revalidatePreservationPaths(cs.matterId)) revalidatePath(path);
  return { ok: true };
}
