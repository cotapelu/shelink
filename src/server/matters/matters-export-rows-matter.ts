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
 * Dựng row cho sheet Vụ án (Matter) + section nguồn Intake + section thủ tục.
 * THUẦN — tách từ matters-export-rows.ts (AUTO-67b).
 */
import {
  barFilingLabel,
  clientTypeLabel,
  feeTypeLabel,
  intakeStatusLabel,
  litigationStandingLabel,
  matterCategoryLabel,
  matterStatusLabel,
  procedureTypeLabel
} from "@/lib/enums";
import { decimalNumber, formatDate, formatDateTime, formatJson, label, yesNo } from "./matters-export-formatters";
import { formatContacts, formatDocuments, formatParty, formatParties, formatProcedureSummary, formatRelatedMatters } from "./matters-export-rows-format";
import { memberRoleLabel, procedureEngagementLabel, procedureOutcomeLabel, procedureStatusLabel } from "./matters-export-labels";
import type { IntakeExportRow, MatterExportRow } from "./matters-export-includes";

function getOtherClients(matter: MatterExportRow): string {
  return matter.clientLinks
    .filter((link) => link.clientId !== matter.primaryClientId)
    .map((link) => `${link.label ? `${link.label}:` : ""}${link.client.name}`)
    .join("；");
}

function getMemberInfo(matter: MatterExportRow): string {
  return matter.members
    .map((member) => `${member.user.name}（${memberRoleLabel[member.role]}）`)
    .join("；");
}

const EMPTY_INTAKE_SOURCE: Record<string, string> = {
  intakeTitle: "",
  intakeStatus: "",
  sourceReceivedAt: "",
  sourceDescription: "",
  sourceFirstProcedureType: "",
  sourceFirstAgency: "",
  sourceJurisdiction: "",
  sourceOurStanding: "",
  sourceClaimAmount: "",
  sourceClaimDescription: "",
  sourceBarFiling: "",
  sourceCounterclaim: "",
  sourceBusinessType: "",
  sourceServiceScope: "",
  sourceDeliverables: "",
  sourceCounselType: "",
  sourceServiceStart: "",
  sourceServiceEnd: "",
  sourceFeeType: "",
  sourceFeeAmount: "",
  sourceFeeSchedule: "",
  sourceFeeNote: "",
  sourceCoUsers: "",
  sourceDocuments: ""
};

function getPrimaryClientType(matter: MatterExportRow): string {
  return matter.primaryClient ? clientTypeLabel[matter.primaryClient.type] : "";
}

function buildMatterBase(matter: MatterExportRow): Record<string, unknown> {
  return {
    internalCode: matter.internalCode,
    firmCaseNo: matter.firmCaseNo ?? "",
    title: matter.title,
    category: matterCategoryLabel[matter.category],
    status: matterStatusLabel[matter.status],
    intakeDate: formatDate(matter.intakeDate),
    firstAcceptedAt: formatDate(matter.firstAcceptedAt),
    closedAt: formatDate(matter.closedAt),
    archivedAt: formatDate(matter.archivedAt)
  };
}

function buildClientSection(matter: MatterExportRow): Record<string, unknown> {
  const pc = matter.primaryClient || ({} as any);
  return {
    primaryClient: pc.name ?? "",
    primaryClientType: getPrimaryClientType(matter),
    primaryClientIdNumber: pc.idNumber ?? "",
    primaryClientAddress: pc.address ?? "",
    primaryClientLegalRep: pc.legalRep ?? "",
    primaryClientContacts: formatContacts(pc.contacts ?? []),
    otherClients: getOtherClients(matter),
    owner: matter.owner.name,
    members: getMemberInfo(matter)
  };
}

function buildCauseSection(matter: MatterExportRow): Record<string, unknown> {
  return {
    cause: matter.cause?.name ?? "",
    causeFreeText: matter.causeFreeText ?? "",
    claimAmount: decimalNumber(matter.claimAmount),
    ourStanding: label(litigationStandingLabel, matter.ourStanding),
    counterclaimAsPlaintiff: yesNo(matter.counterclaimAsPlaintiff),
    counterclaimAsDefendant: yesNo(matter.counterclaimAsDefendant),
    barFiling: label(barFilingLabel, matter.barFiling)
  };
}

function buildServiceSection(matter: MatterExportRow): Record<string, unknown> {
  return {
    businessType: matter.businessType ?? "",
    serviceScope: matter.serviceScope ?? "",
    deliverables: matter.deliverables ?? "",
    counselType: matter.counselType ?? "",
    serviceStart: formatDate(matter.serviceStart),
    serviceEnd: formatDate(matter.serviceEnd)
  };
}

function buildPartiesAndSummary(matter: MatterExportRow): Record<string, unknown> {
  return {
    parties: formatParties(matter.parties),
    procedureSummary: formatProcedureSummary(matter.procedures)
  };
}

function buildRelatedSection(matter: MatterExportRow): Record<string, unknown> {
  return {
    relatedEntities: matter.relatedEntities
      .map((entity) => [entity.name, entity.relationship, entity.notes].filter(Boolean).join(" / "))
      .join("；"),
    relatedMatters: formatRelatedMatters(matter),
    documents: formatDocuments(matter.documents),
    customValues: formatJson(matter.customValues)
  };
}

function buildIntakeCore(source: IntakeExportRow): Record<string, unknown> {
  return {
    intakeTitle: source.title,
    intakeStatus: label(intakeStatusLabel, source.status),
    sourceReceivedAt: formatDate(source.receivedAt),
    sourceDescription: source.description ?? ""
  };
}

function buildIntakeProcedure(source: IntakeExportRow): Record<string, unknown> {
  return {
    sourceFirstProcedureType: label(procedureTypeLabel, source.firstProcedureType),
    sourceFirstAgency: source.firstAgency ?? "",
    sourceJurisdiction: source.jurisdiction ?? "",
    sourceOurStanding: label(litigationStandingLabel, source.ourStanding),
    sourceClaimAmount: decimalNumber(source.claimAmount),
    sourceClaimDescription: source.claimDescription ?? "",
    sourceBarFiling: label(barFilingLabel, source.barFiling),
    sourceCounterclaim: yesNo(source.counterclaim)
  };
}

function buildIntakeFee(source: IntakeExportRow, coUserNames: Map<string, string>): Record<string, unknown> {
  return {
    sourceBusinessType: source.businessType ?? "",
    sourceServiceScope: source.serviceScope ?? "",
    sourceDeliverables: source.deliverables ?? "",
    sourceCounselType: source.counselType ?? "",
    sourceServiceStart: formatDate(source.serviceStart),
    sourceServiceEnd: formatDate(source.serviceEnd),
    sourceFeeType: label(feeTypeLabel, source.feeType),
    sourceFeeAmount: decimalNumber(source.feeAmount),
    sourceFeeSchedule: source.feeSchedule ?? "",
    sourceFeeNote: source.feeNote ?? "",
    sourceCoUsers: (source.coUserIds ?? []).map((id) => coUserNames.get(id) ?? id).join("；"),
    sourceDocuments: formatDocuments(source.documents ?? [])
  };
}

function buildIntakeSourceSection(source: IntakeExportRow | undefined, coUserNames: Map<string, string>): Record<string, unknown> {
  if (!source) return EMPTY_INTAKE_SOURCE;
  return {
    ...buildIntakeCore(source),
    ...buildIntakeProcedure(source),
    ...buildIntakeFee(source, coUserNames)
  };
}

function buildTimestampSection(matter: MatterExportRow): Record<string, unknown> {
  return {
    createdAt: formatDateTime(matter.createdAt),
    updatedAt: formatDateTime(matter.updatedAt)
  };
}

// --- Procedure sub-builders ---

function buildProcedureCommon(procedure: MatterExportRow["procedures"][number], index: number): Record<string, unknown> {
  return {
    [`procedure${index}Type`]: label(procedureTypeLabel, procedure.type),
    [`procedure${index}Label`]: procedure.customLabel ?? "",
    [`procedure${index}Engagement`]: procedureEngagementLabel[procedure.engagement],
    [`procedure${index}Status`]: procedureStatusLabel[procedure.status]
  };
}

function buildProcedureCaseInfo(procedure: MatterExportRow["procedures"][number], index: number): Record<string, unknown> {
  return {
    [`procedure${index}CaseNumber`]: procedure.caseNumber ?? "",
    [`procedure${index}Jurisdiction`]: procedure.jurisdiction ?? "",
    [`procedure${index}HandlingAgency`]: procedure.handlingAgency ?? "",
    [`procedure${index}Panel`]: procedure.panel ?? "",
    [`procedure${index}Handler`]: procedure.handler ?? "",
    [`procedure${index}OurStanding`]: label(litigationStandingLabel, procedure.ourStanding),
    [`procedure${index}LeadLawyer`]: procedure.leadLawyer?.name ?? "",
    [`procedure${index}ExternalLead`]: yesNo(procedure.isExternalLead)
  };
}

function buildProcedureDates(procedure: MatterExportRow["procedures"][number], index: number): Record<string, unknown> {
  return {
    [`procedure${index}AcceptedAt`]: formatDate(procedure.acceptedAt),
    [`procedure${index}ConcludedAt`]: formatDate(procedure.concludedAt)
  };
}

function buildProcedureOutcome(procedure: MatterExportRow["procedures"][number], index: number): Record<string, unknown> {
  return {
    [`procedure${index}Outcome`]: label(procedureOutcomeLabel, procedure.outcome),
    [`procedure${index}OutcomeNote`]: procedure.outcomeNote ?? ""
  };
}

function buildProcedureParties(procedure: MatterExportRow["procedures"][number], index: number): Record<string, unknown> {
  return {
    [`procedure${index}Parties`]: procedure.procedureParties
      .map((row) => `${label(litigationStandingLabel, row.standing)}: ${formatParty(row.party)}`)
      .join("; ")
  };
}

function buildProceduresSection(matter: MatterExportRow, maxProcedures: number): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (let i = 0; i < maxProcedures; i++) {
    const p = matter.procedures[i];
    if (!p) continue;
    Object.assign(result,
      buildProcedureCommon(p, i + 1),
      buildProcedureCaseInfo(p, i + 1),
      buildProcedureDates(p, i + 1),
      buildProcedureOutcome(p, i + 1),
      buildProcedureParties(p, i + 1)
    );
  }
  return result;
}

export function buildMatterRow(
  matter: MatterExportRow,
  maxProcedures: number,
  coUserNames: Map<string, string>
): Record<string, unknown> {
  return {
    ...buildMatterBase(matter),
    ...buildClientSection(matter),
    ...buildCauseSection(matter),
    ...buildServiceSection(matter),
    ...buildPartiesAndSummary(matter),
    ...buildRelatedSection(matter),
    ...buildIntakeSourceSection(matter.intake ?? undefined, coUserNames),
    ...buildTimestampSection(matter),
    ...buildProceduresSection(matter, maxProcedures)
  };
}


