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

import { prisma } from '@/lib/prisma';
import { clientTypeToPartyType } from './helpers';
import { seedDefaultFolders } from '@/lib/default-folders';
import type { Intake, Matter, ProcedureType, LitigationStanding, MatterCategory } from '@prisma/client';

export function determineFirstProcedureType(intake: Intake): ProcedureType {
  if (intake.firstProcedureType) return intake.firstProcedureType as ProcedureType;
  if (
    intake.category === "CIVIL_COMMERCIAL" ||
    intake.category === "CRIMINAL" ||
    intake.category === "ADMINISTRATIVE"
  ) {
    return "FIRST_INSTANCE";
  }
  return "NON_LITIGATION_PHASE";
}

export async function fetchIntakeWithDetails(intakeId: string) {
  const intake = await prisma.intake.findUnique({
    where: { id: intakeId },
    include: {
      client: true,
      parties: true,
      conflictChecks: { orderBy: { checkedAt: "desc" }, take: 1, select: { conclusion: true, note: true, queryPayload: true, hits: { select: { severity: true } } } },
      documents: { select: { id: true } }
    }
  });
  return intake;
}

export function validateIntakeForConversion(intake: Intake | null): asserts intake is Intake {
  if (!intake) throw new Error("Intake 不存在");
  if (intake.status === "CONVERTED") throw new Error("此 Intake 已转化");
}

export async function generateCodes(category: MatterCategory): Promise<{ internalCode: string; firmCaseNo: string }> {
  const { generateInternalCode, generateFirmCaseNo } = await import("@/server/matters/code-generator");
  const internalCode = await generateInternalCode(category);
  const firmCaseNo = await generateFirmCaseNo(category);
  return { internalCode, firmCaseNo };
}

function buildMatterCore(intake: Intake, internalCode: string, firmCaseNo: string, ownerId: string) {
  return {
    internalCode,
    firmCaseNo,
    title: intake.title,
    category: intake.category,
    ownerId,
    causeId: intake.causeId,
    causeFreeText: intake.causeFreeText,
    primaryClientId: intake.clientId,
    intakeId: intake.id,
    intakeDate: intake.receivedAt,
    ourStanding: intake.ourStanding,
    claimAmount: intake.claimAmount
  };
}

function buildMatterCustom(intake: Intake) {
  return {
    counterclaimAsPlaintiff:
      !!intake.counterclaim &&
      (intake.ourStanding === "DEFENDANT" || intake.ourStanding === "JOINT_DEFENDANT"),
    counterclaimAsDefendant:
      !!intake.counterclaim &&
      (intake.ourStanding === "PLAINTIFF" || intake.ourStanding === "JOINT_PLAINTIFF"),
    barFiling: intake.barFiling,
    businessType: intake.businessType,
    serviceScope: intake.serviceScope,
    deliverables: intake.deliverables,
    counselType: intake.counselType,
    serviceStart: intake.serviceStart,
    serviceEnd: intake.serviceEnd
  };
}
function buildMemberships(ownerId: string, coUserIds: string[]) {
  return [
    { userId: ownerId, role: "LEAD" },
    ...coUserIds
      .filter((uid) => uid !== ownerId)
      .map((uid) => ({ userId: uid, role: "CO_LEAD" as const }))
  ];
}

function buildClientLink(clientId: string) {
  return { create: { clientId, isPrimary: true, label: "主要委托方" } };
}

function buildClientPartyData(intake: any, matterId: string) {
  if (!intake.client || !intake.ourStanding) {
    throw new Error("Client or ourStanding missing for party creation");
  }
  return {
    matterId,
    role: "CLIENT_PARTY", standing: intake.ourStanding,
    ordinal: 1,
    name: intake.client.name,
    partyType: clientTypeToPartyType(intake.client.type),
    idNumber: intake.client.type === "INDIVIDUAL" ? intake.client.idNumber : null,
    phone: intake.client.phone,
    address: intake.client.address,
    legalRep: intake.client.legalRep,
    contactName: intake.contactName,
    enterpriseSocialCode: intake.client.type === "INDIVIDUAL" ? null : intake.client.idNumber,
    enterpriseName: intake.client.type === "INDIVIDUAL" ? null : intake.client.name,
    notes: "由收案委托方自动带入首程序"
  };
}

async function createClientParty(
  tx: any,
  matterId: string,
  intake: any
): Promise<{ id: string; standing: LitigationStanding | null }> {
  if (!intake.client || !intake.ourStanding) {
    return { id: "", standing: null };
  }
  const data = buildClientPartyData(intake, matterId);
  const clientParty = await tx.party.create({ data, select: { id: true } });
  return { id: clientParty.id, standing: intake.ourStanding };
}

async function createOtherParties(tx: any, matterId: string, intake: any): Promise<Array<{ partyId: string; standing: LitigationStanding | null }>> {
  const rows: Array<{ partyId: string; standing: LitigationStanding | null }> = [];
  for (const p of intake.parties) {
    const party = await tx.party.create({
      data: {
        matterId, role: p.role, standing: p.standing, ordinal: p.ordinal,
        name: p.name, partyType: p.partyType, idNumber: p.idNumber,
        phone: p.phone, address: p.address, legalRep: p.legalRep,
        contactName: p.contactName, enterpriseSocialCode: p.enterpriseSocialCode,
        enterpriseName: p.enterpriseName, notes: p.notes
      },
      select: { id: true }
    });
    rows.push({ partyId: party.id, standing: p.standing });
  }
  return rows;
}
async function createFirstProcedure(tx: any, matterId: string, firstProcedureType: ProcedureType, intake: any): Promise<{ id: string }> {
  const procedure = await tx.matterProcedure.create({
    data: { matterId, type: firstProcedureType, engagement: "ENGAGED", order: 1, status: "IN_PROGRESS", handlingAgency: intake.firstAgency, jurisdiction: intake.jurisdiction, ourStanding: intake.ourStanding },
    select: { id: true }
  });
  return { id: procedure.id };
}

async function linkProcedureParties(
  tx: any,
  procedureId: string,
  partyRows: Array<{ partyId: string; standing: LitigationStanding; ordinal: number }>
): Promise<void> {
  await tx.procedureParty.createMany({
    data: partyRows.map((row) => ({
      procedureId,
      partyId: row.partyId,
      standing: row.standing,
      ordinal: row.ordinal
    })),
    skipDuplicates: true
  });
}

function buildProcedurePartyRows(
  clientPartyResult: { id: string; standing: LitigationStanding | null },
  otherParties: Array<{ partyId: string; standing: LitigationStanding | null }>
): Array<{ partyId: string; standing: LitigationStanding; ordinal: number }> {
  const rows: Array<{ partyId: string; standing: LitigationStanding; ordinal: number }> = [];
  if (clientPartyResult.id && clientPartyResult.standing) {
    rows.push({ partyId: clientPartyResult.id, standing: clientPartyResult.standing, ordinal: 1 });
  }
  let ordinal = 2;
  for (const p of otherParties) {
    if (p.standing) {
      rows.push({ partyId: p.partyId, standing: p.standing, ordinal: ordinal++ });
    }
  }
  return rows;
}

async function maybeCreateBilling(tx: any, matterId: string, intake: Intake): Promise<void> {
  if (!intake.feeAmount || !intake.feeType) return;
  const feeTypeLabel: Record<string, string> = {
    FIXED: "固定收费",
    CONTINGENCY: "风险代理"
  };
  await tx.billing.create({
    data: {
      matterId,
      title: `委托代理合同 - ${feeTypeLabel[intake.feeType] ?? intake.feeType}`,
      contractAmount: intake.feeAmount,
      schedule: intake.feeSchedule,
      status: "ACTIVE"
    }
  });
}

async function updateDocumentsMatterId(tx: any, intakeId: string, matterId: string): Promise<void> {
  await tx.document.updateMany({
    where: { intakeId },
    data: { matterId }
  });
}

async function convertIntakeStatus(tx: any, intakeId: string): Promise<void> {
  await tx.intake.update({
    where: { id: intakeId },
    data: { status: "CONVERTED" }
  });
}

async function createTimelineEvent(tx: any, matterId: string): Promise<void> {
  await tx.timelineEvent.create({
    data: {
      matterId,
      eventType: "MATTER_CREATED",
      title: "案件已创建（来自 Intake）",
      occurredAt: new Date()
    }
  });
}

function buildMatterData(
  intake: Intake,
  internalCode: string,
  firmCaseNo: string,
  ownerId: string
) {
  return {
    ...buildMatterCore(intake, internalCode, firmCaseNo, ownerId),
    ...buildMatterCustom(intake),
    members: { create: buildMemberships(ownerId, intake.coUserIds) },
    clientLinks: intake.clientId ? buildClientLink(intake.clientId!) : undefined,
  } as any;
}

async function gatherProcedurePartyData(
  tx: any,
  matterId: string,
  intake: Intake
): Promise<Array<{ partyId: string; standing: LitigationStanding; ordinal: number }>> {
  const clientPartyResult = await createClientParty(tx, matterId, intake);
  const otherParties = await createOtherParties(tx, matterId, intake);
  return buildProcedurePartyRows(clientPartyResult, otherParties);
}

async function postProcessTransaction(tx: any, intake: any, matter: Matter): Promise<void> {
  await maybeCreateBilling(tx, matter.id, intake);
  if (intake.documents?.length > 0) {
    await updateDocumentsMatterId(tx, intake.id, matter.id);
  }
  await convertIntakeStatus(tx, intake.id);
  await createTimelineEvent(tx, matter.id);
  await seedDefaultFolders(tx, matter.id, intake.category);
}

export async function executeConversionTransaction(
  tx: any,
  intake: Intake,
  session: any,
  internalCode: string,
  firmCaseNo: string,
  firstProcedureType: ProcedureType
): Promise<Matter> {
  const ownerId = intake.ownerUserId ?? session.user.id;
  const matter = await tx.matter.create({ data: buildMatterData(intake, internalCode, firmCaseNo, ownerId) as any });

  const procedurePartyRows = await gatherProcedurePartyData(tx, matter.id, intake);
  const firstProcedure = await createFirstProcedure(tx, matter.id, firstProcedureType, intake);
  if (procedurePartyRows.length > 0) {
    await linkProcedureParties(tx, firstProcedure.id, procedurePartyRows);
  }

  await postProcessTransaction(tx, intake, matter);
  return matter;
}
