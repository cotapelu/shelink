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
import { assertMatterWritable } from "@/lib/archive/guard";
import {
  assertCanAccessMatter,
  assertCanOwnMatter
} from "@/lib/permissions";
import { generateInternalCode, generateFirmCaseNo } from "./code-generator";
import {
  matterCreateSchema,
  matterListQuerySchema,
  matterUpdateBasicSchema,
  type MatterCreateInput,
  type MatterListQuery,
  type MatterUpdateBasicInput
} from "./schemas";

import {
  createMatterWithSideEffects,
  buildMatterBasicUpdateData,
  authorizeMatterEdit,
  authorizeMatterTeam,
  type MatterTeamUpdateInput
} from "./matter-write-helpers";
import {
  MATTER_LIST_INCLUDE,
  buildMatterListWhere,
  sortMatterListItems
} from "./actions-list-query";
import {
  type ProcedureInfoInput,
  authorizeProcedureUpdate,
  normalizeProcedurePartyInput,
  assertProcedurePartiesBelongToMatter,
  applyProcedureInfoUpdates
} from "./procedure-info";


/**
 * List matters with filtering, pagination, and visibility checks.
 * @param input - MatterListQuery (filters: category, status, ownerId, clientId, date range, search, sorting)
 * @returns Promise<{ items: Matter[], total: number, page: number, pageSize: number }>
 * @throws {ZodError} - if input validation fails
 * @access Requires authenticated session (visibility filter applied)
 * @audit Logs matter access (read)
 */
export async function listMatters(input: Partial<MatterListQuery> = {}) {
  const session = await requireSession();
  const query = matterListQuerySchema.parse(input);

  const where = buildMatterListWhere(session.user.id, session.user.role, query);
  const [allItems, total] = await Promise.all([
    prisma.matter.findMany({ where, orderBy: [{ updatedAt: "desc" }], include: MATTER_LIST_INCLUDE }),
    prisma.matter.count({ where })
  ]);

  const sorted = sortMatterListItems(allItems, query);
  const start = (query.page - 1) * query.pageSize;
  const items = sorted.slice(start, start + query.pageSize);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

// v0.32: Chỉnh sửa thông tin cơ bản của thủ tục
export async function updateProcedureInfo(input: ProcedureInfoInput) {
  const { session, matterId } = await authorizeProcedureUpdate(input);
  const { partyRows, newPartyRows } = normalizeProcedurePartyInput(input);
  await assertProcedurePartiesBelongToMatter(matterId, partyRows);
  await prisma.$transaction((tx) =>
    applyProcedureInfoUpdates(tx, { procedureId: input.procedureId, matterId, input, partyRows, newPartyRows })
  );
  await audit({
    userId: session.user.id,
    action: "PROCEDURE_INFO_UPDATE",
    targetType: "MatterProcedure",
    targetId: input.procedureId,
    detail: { matterId }
  });
  revalidatePath(`/matters/${matterId}`);
}



const MATTER_DETAIL_INCLUDE = {
  primaryClient: { include: { contacts: { where: { isPrimary: true }, take: 1 } } },
  clientLinks: { include: { client: { select: { id: true, name: true, type: true, idNumber: true } } } },
  owner: { select: { id: true, name: true, role: true } },
  members: {
    include: { user: { select: { id: true, name: true, role: true } } }
  },
  cause: true,
  parties: { orderBy: [{ role: "asc" }, { ordinal: "asc" }] },
  relatedEntities: { orderBy: { createdAt: "asc" } },
  intake: { select: { counterclaim: true, claimDescription: true } },
  linksFrom: {
    include: { relatedMatter: { select: { id: true, internalCode: true, title: true } } }
  },
  linksTo: {
    include: { matter: { select: { id: true, internalCode: true, title: true } } }
  },
  procedures: {
    orderBy: { order: "asc" },
    include: {
      deadlines: { orderBy: [{ completed: "asc" }, { dueAt: "asc" }] },
      hearings: { orderBy: { startsAt: "asc" } },
      stages: { orderBy: { order: "asc" } },
      procedureParties: {
        orderBy: [{ standing: "asc" }, { ordinal: "asc" }],
        include: { party: true }
      },
      memos: { orderBy: [{ done: "asc" }, { createdAt: "desc" }] }
    }
  },
  timelineEvents: { orderBy: { occurredAt: "desc" }, take: 50 }
} satisfies Prisma.MatterInclude;

export async function getMatterById(id: string) {
  const session = await requireSession();
  await assertCanAccessMatter(session.user.id, session.user.role, id);
  const matter = await prisma.matter.findFirst({
    where: { id, deletedAt: null },
    include: MATTER_DETAIL_INCLUDE
  });
  if (matter) {
    await audit({
      userId: session.user.id,
      action: "MATTER_VIEW",
      targetType: "Matter",
      targetId: id
    });
  }
  return matter;
}


async function logMatterCreated(userId: string, created: { id: string; internalCode: string; title: string }) {
  await audit({
    userId,
    action: "MATTER_CREATE",
    targetType: "Matter",
    targetId: created.id,
    detail: { internalCode: created.internalCode, title: created.title }
  });
}

export async function createMatter(input: MatterCreateInput) {
  const session = await requireSession();
  const data = matterCreateSchema.parse(input);
  const [primaryClientId] = data.clientIds;
  const internalCode = await generateInternalCode(data.category);
  const firmCaseNo = await generateFirmCaseNo(data.category);
  const args = { data, ownerId: session.user.id, primaryClientId, internalCode, firmCaseNo };
  const created = await prisma.$transaction((tx) => createMatterWithSideEffects(tx, args));
  await logMatterCreated(session.user.id, created);
  revalidatePath("/matters");
  return { ok: true, id: created.id, internalCode: created.internalCode };
}

/**
 * v0.5: Cập nhật team của vụ án.
 * - Chỉ luật sư phụ trách hiện tại được thao tác; vai trò quản lý chỉ phê duyệt, không mở quyền xử lý vụ án người khác
 * - Khi ownerId thay đổi, đồng bộ thay LEAD trong MatterMember
 * - coLeadIds và assistantIds ghi đè các vai trò tương ứng (không ảnh hưởng đến LEAD tự động của chủ vụ)
 */
type MatterTeamMemberRow = {
  matterId: string;
  userId: string;
  role: "LEAD" | "CO_LEAD" | "ASSISTANT";
};

function buildTeamMemberRows(
  matterId: string,
  ownerId: string,
  coLeadIds: string[],
  assistantIds: string[]
): MatterTeamMemberRow[] {
  return [
    { matterId, userId: ownerId, role: "LEAD" },
    ...coLeadIds.map((uid) => ({ matterId, userId: uid, role: "CO_LEAD" as const })),
    ...assistantIds.map((uid) => ({ matterId, userId: uid, role: "ASSISTANT" as const }))
  ];
}

function sanitizeTeamIds(input: { ownerId: string; coLeadIds: string[]; assistantIds: string[] }) {
  const co = input.coLeadIds.filter((id) => id !== input.ownerId);
  const ass = input.assistantIds.filter((id) => id !== input.ownerId && !co.includes(id));
  return { co, ass };
}

async function applyMatterTeamUpdate(
  tx: Prisma.TransactionClient,
  input: { matterId: string; ownerId: string; currentOwnerId: string; co: string[]; ass: string[] }
) {
  if (input.currentOwnerId !== input.ownerId) {
    await tx.matter.update({ where: { id: input.matterId }, data: { ownerId: input.ownerId } });
  }
  await tx.matterMember.deleteMany({ where: { matterId: input.matterId } });
  await tx.matterMember.createMany({
    data: buildTeamMemberRows(input.matterId, input.ownerId, input.co, input.ass),
    skipDuplicates: true
  });
}

type TeamUpdateDetail = { ownerId: string; coLeads: number; assistants: number };

async function finishMatterTeamUpdate(userId: string, matterId: string, detail: TeamUpdateDetail) {
  await audit({ userId, action: "MATTER_TEAM_UPDATE", targetType: "Matter", targetId: matterId, detail });
  // v0.43 mục 4: Ghi timeline vụ án
  await prisma.timelineEvent.create({
    data: {
      matterId, eventType: "TEAM_CHANGED", title: "Cập nhật team xử lý", occurredAt: new Date(),
      refType: "Matter", refId: matterId
    }
  });
  revalidatePath(`/matters/${matterId}`);
}

export async function updateMatterTeam(input: MatterTeamUpdateInput) {
  const session = await requireSession();
  const message = "Chỉ luật sư phụ trách hiện tại được sửa team vụ án";
  const matter = await authorizeMatterTeam(session, input.matterId, message);
  // Validate: coLeadIds / assistantIds không được overlap với ownerId
  const { co, ass } = sanitizeTeamIds(input);
  await prisma.$transaction((tx) =>
    applyMatterTeamUpdate(tx, { matterId: input.matterId, ownerId: input.ownerId, currentOwnerId: matter.ownerId, co, ass })
  );

  await finishMatterTeamUpdate(session.user.id, input.matterId, {
    ownerId: input.ownerId,
    coLeads: co.length,
    assistants: ass.length
  });
  return { ok: true };
}

// v0.27: Chỉnh sửa thông tin cơ bản vụ án (system编号 + ngày nhận readonly, status đi qua lifecycle)
export async function updateMatterBasicInfo(input: MatterUpdateBasicInput) {
  const session = await requireSession();
  const data = matterUpdateBasicSchema.parse(input);

  const matter = await authorizeMatterEdit(
    session,
    data.id,
    "Chỉ luật sư phụ trách hiện tại được chỉnh sửa thông tin vụ án"
  );
  await prisma.matter.update({ where: { id: data.id }, data: buildMatterBasicUpdateData(data) });
  await audit({
    userId: session.user.id,
    action: "MATTER_BASIC_UPDATE",
    targetType: "Matter",
    targetId: data.id,
    detail: { titleBefore: matter.title, titleAfter: data.title }
  });
  revalidatePath(`/matters/${data.id}`);
  return { ok: true };
}

export async function softDeleteMatter(id: string) {
  const session = await requireSession();
  await assertMatterWritable(id);
  await assertCanOwnMatter(session.user.id, id, "Chỉ luật sư phụ trách hiện tại được xóa vụ án");

  await prisma.matter.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  await audit({
    userId: session.user.id,
    action: "MATTER_DELETE",
    targetType: "Matter",
    targetId: id
  });

  revalidatePath("/matters");
  return { ok: true };
}
