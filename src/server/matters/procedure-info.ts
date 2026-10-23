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

import { LitigationStanding, PartyRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanAccessMatter } from "@/lib/permissions";
import {
  normalizeProcedureParties,
  normalizeNewProcedureParties,
  type NewProcedurePartyInput
} from "./helpers";
import { ensureClientParty } from "./actions-link";

export type ProcedureInfoInput = {
  procedureId: string;
  jurisdiction?: string;
  handlingAgency?: string;
  caseNumber?: string;
  presidingJudge?: string;
  presidingJudgeContact?: string;
  judgeAssistant?: string;
  judgeAssistantContact?: string;
  ourStanding?: string | null;
  acceptedAt?: string | null;
  concludedAt?: string | null;
  procedureParties?: { partyId: string; standing: LitigationStanding }[];
  newProcedureParties?: NewProcedurePartyInput[];
};

export type MergedProcedureParty = { partyId: string; standing: LitigationStanding };

export function splitPartyIds(partyIds: string[]) {
  const realPartyIds = partyIds.filter((partyId) => !partyId.startsWith("client:"));
  const clientIds = partyIds
    .filter((partyId) => partyId.startsWith("client:"))
    .map((partyId) => partyId.slice("client:".length));
  return { realPartyIds, clientIds };
}

export async function loadValidPartyIds(matterId: string, realPartyIds: string[]) {
  const validParties = await prisma.party.findMany({
    where: { matterId, id: { in: realPartyIds } },
    select: { id: true }
  });
  return new Set(validParties.map((party) => party.id));
}

export async function loadValidClientIds(matterId: string) {
  const matterClients = await prisma.matter.findUnique({
    where: { id: matterId },
    select: { primaryClientId: true, clientLinks: { select: { clientId: true } } }
  });
  return new Set([
    ...(matterClients?.primaryClientId ? [matterClients.primaryClientId] : []),
    ...(matterClients?.clientLinks.map((link) => link.clientId) ?? [])
  ]);
}

export async function assertProcedurePartiesBelongToMatter(
  matterId: string,
  partyRows: MergedProcedureParty[] | null
) {
  if (!partyRows) return;
  const partyIds = [...new Set(partyRows.map((row) => row.partyId))];
  const { realPartyIds, clientIds } = splitPartyIds(partyIds);
  const validPartyIds = await loadValidPartyIds(matterId, realPartyIds);
  const validClientIds =
    clientIds.length > 0 ? await loadValidClientIds(matterId) : new Set<string>();
  const hasUnknownParty = partyRows.some(
    (row) => !row.partyId.startsWith("client:") && !validPartyIds.has(row.partyId)
  );
  const hasUnknownClient = clientIds.some((clientId) => !validClientIds.has(clientId));
  if (hasUnknownParty || hasUnknownClient) {
    throw new Error("Tồn tại party không thuộc vụ án này");
  }
}

export async function computeNextOrdinalByRole(
  tx: Prisma.TransactionClient,
  matterId: string,
  newPartyRows: NewProcedurePartyInput[]
) {
  const nextOrdinalByRole = new Map<PartyRole, number>();
  for (const role of [...new Set(newPartyRows.map((row) => row.role))]) {
    const max = await tx.party.aggregate({
      where: { matterId, role },
      _max: { ordinal: true }
    });
    nextOrdinalByRole.set(role, (max._max.ordinal ?? 0) + 1);
  }
  return nextOrdinalByRole;
}

export function buildPartyData(row: NewProcedurePartyInput) {
  const isNatural = row.partyType === "NATURAL_PERSON";
  return {
    role: row.role,
    name: row.name,
    partyType: row.partyType,
    standing: row.standings[0] ?? null,
    idNumber: isNatural ? row.idNumber : null,
    enterpriseSocialCode: isNatural ? null : row.enterpriseSocialCode,
    enterpriseName: isNatural ? null : row.name
  };
}

export function takeNextOrdinal(nextOrdinalByRole: Map<PartyRole, number>, role: PartyRole) {
  const ordinal = nextOrdinalByRole.get(role) ?? 1;
  nextOrdinalByRole.set(role, ordinal + 1);
  return ordinal;
}

export async function createProcedureParty(
  tx: Prisma.TransactionClient,
  matterId: string,
  row: NewProcedurePartyInput,
  nextOrdinalByRole: Map<PartyRole, number>
) {
  const createdParty = await tx.party.create({
    data: { matterId, ...buildPartyData(row), ordinal: takeNextOrdinal(nextOrdinalByRole, row.role) },
    select: { id: true }
  });
  return createdParty.id;
}

export async function upsertProcedurePartyRow(
  tx: Prisma.TransactionClient,
  matterId: string,
  row: NewProcedurePartyInput,
  nextOrdinalByRole: Map<PartyRole, number>
) {
  if (!row.existingPartyId) {
    return createProcedureParty(tx, matterId, row, nextOrdinalByRole);
  }
  const existingParty = await tx.party.findFirst({
    where: { id: row.existingPartyId, matterId },
    select: { id: true }
  });
  if (!existingParty) throw new Error("Tồn tại party không thuộc vụ án này");
  await tx.party.update({ where: { id: existingParty.id }, data: buildPartyData(row) });
  return existingParty.id;
}

export async function appendNewProcedureParties(
  tx: Prisma.TransactionClient,
  matterId: string,
  newPartyRows: NewProcedurePartyInput[],
  mergedProcedureParties: MergedProcedureParty[]
) {
  if (newPartyRows.length === 0) return;
  const nextOrdinalByRole = await computeNextOrdinalByRole(tx, matterId, newPartyRows);
  for (const row of newPartyRows) {
    const partyId = await upsertProcedurePartyRow(tx, matterId, row, nextOrdinalByRole);
    for (const standing of row.standings) {
      mergedProcedureParties.push({ partyId, standing });
    }
  }
}

export async function replaceProcedureParties(
  tx: Prisma.TransactionClient,
  procedureId: string,
  mergedProcedureParties: MergedProcedureParty[]
) {
  await tx.procedureParty.deleteMany({ where: { procedureId } });
  if (mergedProcedureParties.length === 0) return;
  await tx.procedureParty.createMany({
    data: mergedProcedureParties.map((row, idx) => ({
      procedureId,
      partyId: row.partyId,
      standing: row.standing,
      ordinal: idx + 1
    })),
    skipDuplicates: true
  });
}

export function trimToNull(value: string | null | undefined) {
  return value?.trim() || null;
}

export function buildTrimmedTextData(input: ProcedureInfoInput) {
  return {
    jurisdiction: trimToNull(input.jurisdiction),
    handlingAgency: trimToNull(input.handlingAgency),
    caseNumber: trimToNull(input.caseNumber),
    presidingJudge: trimToNull(input.presidingJudge),
    presidingJudgeContact: trimToNull(input.presidingJudgeContact),
    judgeAssistant: trimToNull(input.judgeAssistant),
    judgeAssistantContact: trimToNull(input.judgeAssistantContact)
  };
}

export function buildProcedureDateData(input: ProcedureInfoInput) {
  return {
    acceptedAt: input.acceptedAt ? new Date(input.acceptedAt) : null,
    concludedAt: input.concludedAt ? new Date(input.concludedAt) : null
  };
}

export function buildProcedureStandingData(input: ProcedureInfoInput) {
  return {
    ourStanding: input.ourStanding ? (input.ourStanding as LitigationStanding) : null
  };
}

export function buildProcedureInfoData(input: ProcedureInfoInput) {
  return {
    ...buildTrimmedTextData(input),
    ...buildProcedureDateData(input),
    ...buildProcedureStandingData(input)
  };
}

export async function resolveClientPartyIds(
  tx: Prisma.TransactionClient,
  matterId: string,
  mergedProcedureParties: MergedProcedureParty[]
) {
  for (const row of mergedProcedureParties) {
    if (row.partyId.startsWith("client:")) {
      row.partyId = await ensureClientParty(
        tx,
        matterId,
        row.partyId.slice("client:".length),
        row.standing
      );
    }
  }
}

export async function applyProcedureInfoUpdates(
  tx: Prisma.TransactionClient,
  args: {
    procedureId: string;
    matterId: string;
    input: ProcedureInfoInput;
    partyRows: MergedProcedureParty[] | null;
    newPartyRows: NewProcedurePartyInput[];
  }
) {
  const { procedureId, matterId, input, partyRows, newPartyRows } = args;
  const merged: MergedProcedureParty[] = [...(partyRows ?? [])];
  await resolveClientPartyIds(tx, matterId, merged);
  await appendNewProcedureParties(tx, matterId, newPartyRows, merged);
  await tx.matterProcedure.update({ where: { id: procedureId }, data: buildProcedureInfoData(input) });
  if (partyRows || newPartyRows.length > 0) {
    await replaceProcedureParties(tx, procedureId, merged);
  }
}

export async function authorizeProcedureUpdate(input: ProcedureInfoInput) {
  const session = await requireSession();
  const proc = await prisma.matterProcedure.findUnique({
    where: { id: input.procedureId },
    select: { matterId: true }
  });
  if (!proc) throw new Error("Thủ tục không tồn tại");
  await assertCanAccessMatter(session.user.id, session.user.role, proc.matterId);
  await assertMatterWritable(proc.matterId);
  return { session, matterId: proc.matterId };
}

export function normalizeProcedurePartyInput(input: ProcedureInfoInput) {
  const partyRows = input.procedureParties
    ? normalizeProcedureParties(input.procedureParties)
    : null;
  const newPartyRows = normalizeNewProcedureParties(input.newProcedureParties ?? []);
  if ((input.newProcedureParties?.length ?? 0) !== newPartyRows.length) {
    throw new Error("Thông tin party thủ tục mới không đầy đủ");
  }
  return { partyRows, newPartyRows };
}
