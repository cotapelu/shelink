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
 * Server actions cho Bên bị bảo toàn (target) + Tài sản bảo toàn (property).
 * Tách từ actions-v2.ts (AUTO-67c). Case CRUD ở preservation-case-actions.ts.
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertMatterWritable } from "@/lib/archive/guard";
import { matterAssociationFilter } from "@/lib/permissions";
import {
  targetCreateSchema,
  targetUpdateSchema,
  propertyCreateSchema,
  propertyUpdateSchema,
  propertyRenewSchema
} from "./schemas-v2";
import {
  assertCanAccessPreservationCaseRecord,
  loadPropertyWithCase,
  loadTargetWithCase,
  revalidatePreservationPaths
} from "./preservation-access";

async function assertTargetWritable(userId: string, targetId: string) {
  const target = await loadTargetWithCase(targetId);
  await assertCanAccessPreservationCaseRecord(userId, target.case);
  if (target.case.matterId) await assertMatterWritable(target.case.matterId);
  return target;
}

async function assertPropertyWritable(userId: string, propertyId: string) {
  const property = await loadPropertyWithCase(propertyId);
  await assertCanAccessPreservationCaseRecord(userId, property.target.case);
  if (property.target.case.matterId) await assertMatterWritable(property.target.case.matterId);
  return property;
}

// ━━━━ Target CRUD ━━━━

export async function addTarget(input: z.infer<typeof targetCreateSchema>) {
  const session = await requireSession();
  const data = targetCreateSchema.parse(input);
  const target = await assertTargetWritable(session.user.id, data.caseId);

  const created = await prisma.preservationTarget.create({
    data: { caseId: data.caseId, name: data.name.trim(), note: data.note?.trim() || null }
  });

  for (const path of revalidatePreservationPaths(target.case.matterId)) revalidatePath(path);
  return { ok: true, id: created.id };
}

function targetUpdatePatch(data: z.infer<typeof targetUpdateSchema>) {
  const patch: Prisma.PreservationTargetUpdateInput = {};
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.note !== undefined) patch.note = data.note?.trim() || null;
  return patch;
}

export async function updateTarget(input: z.infer<typeof targetUpdateSchema>) {
  const session = await requireSession();
  const data = targetUpdateSchema.parse(input);
  const target = await assertTargetWritable(session.user.id, data.id);
  await prisma.preservationTarget.update({ where: { id: data.id }, data: targetUpdatePatch(data) });
  for (const path of revalidatePreservationPaths(target.case.matterId)) revalidatePath(path);
  return { ok: true };
}

export async function deleteTarget(id: string) {
  const session = await requireSession();
  const target = await assertTargetWritable(session.user.id, id);
  await prisma.preservationTarget.delete({ where: { id } });
  for (const path of revalidatePreservationPaths(target.case.matterId)) revalidatePath(path);
  return { ok: true };
}

// ━━━━ Property CRUD ━━━━

function propertyCreateData(data: z.infer<typeof propertyCreateSchema>) {
  return {
    targetId: data.targetId,
    propertyType: data.propertyType,
    propertyDetail: data.propertyDetail?.trim() || null,
    amount: data.amount != null ? new Prisma.Decimal(data.amount) : null,
    startDate: data.startDate,
    duration: data.duration,
    expiryDate: data.expiryDate,
    status: "ACTIVE" as const
  };
}

export async function addProperty(input: z.infer<typeof propertyCreateSchema>) {
  const session = await requireSession();
  const data = propertyCreateSchema.parse(input);
  if (data.expiryDate <= data.startDate) throw new Error("Ngày đến hạn phải sau ngày có hiệu lực");
  const target = await assertTargetWritable(session.user.id, data.targetId);

  const created = await prisma.preservationProperty.create({ data: propertyCreateData(data) });

  await audit({ userId: session.user.id, action: "PRESERVATION_PROPERTY_CREATE", targetType: "PreservationProperty", targetId: created.id, detail: { propertyType: data.propertyType } });
  for (const path of revalidatePreservationPaths(target.case.matterId)) revalidatePath(path);
  return { ok: true, id: created.id };
}

function propertyUpdatePatch(data: z.infer<typeof propertyUpdateSchema>) {
  const { amount, propertyDetail, ...rest } = data;
  const patch: Prisma.PreservationPropertyUpdateInput = { ...rest };
  if (amount !== undefined) patch.amount = amount != null ? new Prisma.Decimal(amount) : null;
  if (propertyDetail !== undefined) patch.propertyDetail = propertyDetail?.trim() || null;
  return patch;
}

export async function updateProperty(input: z.infer<typeof propertyUpdateSchema>) {
  const session = await requireSession();
  const data = propertyUpdateSchema.parse(input);
  const property = await assertPropertyWritable(session.user.id, data.id);
  await prisma.preservationProperty.update({ where: { id: data.id }, data: propertyUpdatePatch(data) });
  for (const path of revalidatePreservationPaths(property.target.case.matterId)) revalidatePath(path);
  return { ok: true };
}

function assertRenewable(prop: { status: string; expiryDate: Date }, newExpiryDate: Date) {
  if (prop.status === "LIFTED") throw new Error("Bảo toàn đã gỡ bỏ thì không gia hạn được");
  if (newExpiryDate <= prop.expiryDate) {
    throw new Error("Ngày đến hạn mới phải sau ngày đến hạn cũ");
  }
}

export async function renewProperty(input: z.infer<typeof propertyRenewSchema>) {
  const session = await requireSession();
  const data = propertyRenewSchema.parse(input);
  const prop = await assertPropertyWritable(session.user.id, data.propertyId);
  assertRenewable(prop, data.newExpiryDate);

  const renewalData = {
    propertyId: data.propertyId,
    renewedAt: new Date(),
    oldExpiryDate: prop.expiryDate,
    newExpiryDate: data.newExpiryDate,
    renewalDuration: data.renewalDuration,
    note: data.note?.trim() || null,
    performedById: session.user.id
  };
  await prisma.$transaction([
    prisma.preservationPropertyRenewal.create({ data: renewalData }),
    prisma.preservationProperty.update({ where: { id: data.propertyId }, data: { expiryDate: data.newExpiryDate, status: "RENEWED" } })
  ]);

  for (const path of revalidatePreservationPaths(prop.target.case.matterId)) revalidatePath(path);
  return { ok: true };
}

export async function liftProperty(propertyId: string) {
  const session = await requireSession();
  const prop = await assertPropertyWritable(session.user.id, propertyId);
  await prisma.preservationProperty.update({ where: { id: propertyId }, data: { status: "LIFTED" } });
  for (const path of revalidatePreservationPaths(prop.target.case.matterId)) revalidatePath(path);
  return { ok: true };
}

export async function deleteProperty(id: string) {
  const session = await requireSession();
  const property = await assertPropertyWritable(session.user.id, id);
  await prisma.preservationProperty.delete({ where: { id } });
  for (const path of revalidatePreservationPaths(property.target.case.matterId)) revalidatePath(path);
  return { ok: true };
}

// for dashboard alerts
function expiringPropertyWhere(userId: string, end: Date) {
  return {
    status: { in: ["ACTIVE", "RENEWED"] },
    expiryDate: { lte: end },
    target: {
      case: {
        OR: [
          { matter: { deletedAt: null, ...matterAssociationFilter(userId) } },
          { matterId: null, ownerId: userId }
        ]
      }
    }
  } satisfies Prisma.PreservationPropertyWhereInput;
}

export async function listExpiringProperties(daysAhead = 60) {
  const session = await requireSession();
  const end = new Date();
  end.setDate(end.getDate() + daysAhead);

  return prisma.preservationProperty.findMany({
    where: expiringPropertyWhere(session.user.id, end),
    orderBy: { expiryDate: "asc" },
    include: {
      target: {
        include: {
          case: {
            include: { matter: { select: { id: true, internalCode: true, title: true } } }
          }
        }
      }
    }
  });
}
