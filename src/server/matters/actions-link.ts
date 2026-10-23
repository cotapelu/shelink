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
import { LitigationStanding, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { matterAssociationFilter, assertCanAssociateMatter } from "@/lib/permissions";
import { clientTypeToPartyType } from "./helpers";

export async function ensureClientParty(
  tx: Prisma.TransactionClient,
  matterId: string,
  clientId: string,
  standing: LitigationStanding
) {
  const client = await tx.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, type: true, idNumber: true }
  });
  if (!client) throw new Error("Khách hàng không tồn tại");

  const existing = await tx.party.findFirst({
    where: {
      matterId,
      role: "CLIENT_PARTY",
      name: client.name
    },
    select: { id: true }
  });
  if (existing) return existing.id;

  const max = await tx.party.aggregate({
    where: { matterId, role: "CLIENT_PARTY" },
    _max: { ordinal: true }
  });
  const partyType = clientTypeToPartyType(client.type);
  const created = await tx.party.create({
    data: {
      matterId,
      role: "CLIENT_PARTY",
      ordinal: (max._max.ordinal ?? 0) + 1,
      name: client.name,
      partyType,
      standing,
      idNumber: partyType === "NATURAL_PERSON" ? client.idNumber : null,
      enterpriseSocialCode: partyType === "NATURAL_PERSON" ? null : client.idNumber,
      enterpriseName: partyType === "NATURAL_PERSON" ? null : client.name,
      notes: "Tự động bổ sung từ client liên kết vụ án"
    },
    select: { id: true }
  });
  return created.id;
}




// v0.32: Liên kết vụ án —— Tìm kiếm / Liên kết / Hủy liên kết
export async function searchMattersForLink(matterId: string, q: string) {
  const session = await requireSession();
  await assertCanAssociateMatter(session.user.id, matterId);
  const query = q.trim();
  // Đã liên kết (cả hai chiều) loại trừ
  const links = await prisma.matterLink.findMany({
    where: { OR: [{ matterId }, { relatedMatterId: matterId }] },
    select: { matterId: true, relatedMatterId: true }
  });
  const excludeIds = new Set<string>([matterId]);
  links.forEach((l) => {
    excludeIds.add(l.matterId);
    excludeIds.add(l.relatedMatterId);
  });
  const items = await prisma.matter.findMany({
    where: {
      deletedAt: null,
      id: { notIn: Array.from(excludeIds) },
      ...matterAssociationFilter(session.user.id),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { internalCode: { contains: query, mode: "insensitive" } }
            ]
          }
        : {})
    },
    select: { id: true, internalCode: true, title: true },
    orderBy: { createdAt: "desc" },
    take: 8
  });
  return items;
}

export async function addMatterLink(matterId: string, relatedMatterId: string) {
  const session = await requireSession();
  await assertCanAssociateMatter(session.user.id, matterId);
  await assertCanAssociateMatter(session.user.id, relatedMatterId);
  if (matterId === relatedMatterId) throw new Error("Không thể liên kết đến chính vụ án này");
  await prisma.matterLink.upsert({
    where: { matterId_relatedMatterId: { matterId, relatedMatterId } },
    create: { matterId, relatedMatterId },
    update: {}
  });
  await audit({
    userId: session.user.id,
    action: "MATTER_LINK_ADD",
    targetType: "Matter",
    targetId: matterId,
    detail: { relatedMatterId }
  });
  revalidatePath(`/matters/${matterId}`);
}

export async function removeMatterLink(matterId: string, relatedMatterId: string) {
  const session = await requireSession();
  await assertCanAssociateMatter(session.user.id, matterId);
  await assertCanAssociateMatter(session.user.id, relatedMatterId);
  // Xóa cả hai chiều (bất kể ban đầu ai liên kết ai)
  await prisma.matterLink.deleteMany({
    where: {
      OR: [
        { matterId, relatedMatterId },
        { matterId: relatedMatterId, relatedMatterId: matterId }
      ]
    }
  });
  await audit({
    userId: session.user.id,
    action: "MATTER_LINK_REMOVE",
    targetType: "Matter",
    targetId: matterId,
    detail: { relatedMatterId }
  });
  revalidatePath(`/matters/${matterId}`);
}

/**
 * Get matter by ID with full includes and permission check.
 * @param id - Matter ID
 * @returns Promise<Matter> - matter with all relations (client, parties, cause, members, etc.)
 * @throws {Error} - if matter not found or user lacks access
 * @access Requires authenticated session; checks matter visibility permissions
 * @audit Logs matter view
 */
