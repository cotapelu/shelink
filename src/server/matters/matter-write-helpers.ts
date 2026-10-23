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
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { seedDefaultFolders } from "@/lib/default-folders";
import { audit } from "@/server/audit";
import { buildMatterCreateData } from "./helpers";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanOwnMatter } from "@/lib/permissions";
import type { MatterCreateInput, MatterUpdateBasicInput } from "./schemas";

export type MatterTeamUpdateInput = {
  matterId: string;
  ownerId: string;
  coLeadIds: string[];
  assistantIds: string[];
};

export async function createMatterWithSideEffects(
  tx: Prisma.TransactionClient,
  args: {
    data: MatterCreateInput;
    ownerId: string;
    primaryClientId: string;
    internalCode: string;
    firmCaseNo: string;
  }
) {
  const matter = await tx.matter.create({
    data: buildMatterCreateData(
      args.data,
      args.ownerId,
      args.primaryClientId,
      args.internalCode,
      args.firmCaseNo
    )
  });

  // TimelineEvent: Tạo vụ án
  await tx.timelineEvent.create({
    data: {
      matterId: matter.id,
      eventType: "MATTER_CREATED",
      title: "Vụ án đã được tạo",
      occurredAt: new Date()
    }
  });

  // v0.8: Thư mục mặc định
  await seedDefaultFolders(tx, matter.id, args.data.category);
  return matter;
}

export function buildMatterBasicUpdateData(data: MatterUpdateBasicInput) {
  return {
    title: data.title,
    causeId: data.causeId ? data.causeId : null,
    causeFreeText: data.causeFreeText ? data.causeFreeText : null,
    claimAmount:
      data.claimAmount === null || data.claimAmount === undefined
        ? null
        : new Prisma.Decimal(data.claimAmount),
    ourStanding: data.ourStanding ?? null
  };
}

export async function authorizeMatterEdit(session: { user: { id: string } }, matterId: string, message: string) {
  const matter = await prisma.matter.findUnique({
    where: { id: matterId, deletedAt: null },
    select: { id: true, ownerId: true, title: true }
  });
  if (!matter) throw new Error("Vụ án không tồn tại");
  await assertMatterWritable(matterId);
  await assertCanOwnMatter(session.user.id, matterId, message);
  return matter;
}

export async function authorizeMatterTeam(session: { user: { id: string } }, matterId: string, message: string) {
  const matter = await prisma.matter.findUnique({
    where: { id: matterId, deletedAt: null },
    select: { id: true, ownerId: true }
  });
  if (!matter) throw new Error("Vụ án không tồn tại");
  await assertMatterWritable(matterId);
  await assertCanOwnMatter(session.user.id, matterId, message);
  return matter;
}
