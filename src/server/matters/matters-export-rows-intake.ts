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
 * Dựng row cho sheet Tiếp nhận (Intake). THUẦN — tách từ matters-export-rows.ts (AUTO-67b).
 */
import { barFilingLabel, clientTypeLabel, feeTypeLabel, intakeStatusLabel, litigationStandingLabel, matterCategoryLabel, procedureTypeLabel } from "@/lib/enums";
import { decimalNumber, formatDate, formatDateTime, label, yesNo } from "./matters-export-formatters";
import { formatContacts, formatDocuments, formatParties } from "./matters-export-rows-format";
import type { IntakeExportRow } from "./matters-export-includes";

function buildIntakeClientCore(intake: IntakeExportRow): Record<string, unknown> {
  return {
    id: intake.id,
    title: intake.title,
    category: matterCategoryLabel[intake.category],
    status: label(intakeStatusLabel, intake.status),
    receivedAt: formatDate(intake.receivedAt),
    cause: intake.cause?.name ?? "",
    causeFreeText: intake.causeFreeText ?? "",
    description: intake.description ?? ""
  };
}

function buildIntakeClientIdentity(intake: IntakeExportRow): Record<string, unknown> {
  return {
    client: intake.client?.name ?? "",
    clientIdNumber: intake.client?.idNumber ?? "",
    clientAddress: intake.client?.address ?? "",
    clientLegalRep: intake.client?.legalRep ?? "",
    contactName: intake.contactName ?? ""
  };
}

function buildIntakeClientTypeContact(intake: IntakeExportRow): Record<string, unknown> {
  return {
    clientType: intake.client ? clientTypeLabel[intake.client.type] : label(clientTypeLabel, intake.clientType),
    contactPhone: intake.contactPhone ?? intake.client?.phone ?? "",
    clientContacts: formatContacts(intake.client?.contacts ?? [])
  };
}

function buildIntakeClientSection(intake: IntakeExportRow): Record<string, unknown> {
  return {
    ...buildIntakeClientCore(intake),
    ...buildIntakeClientIdentity(intake),
    ...buildIntakeClientTypeContact(intake)
  };
}
function buildIntakeProcedureSection(intake: IntakeExportRow): Record<string, unknown> {
  return {
    firstProcedureType: label(procedureTypeLabel, intake.firstProcedureType),
    firstAgency: intake.firstAgency ?? "",
    jurisdiction: intake.jurisdiction ?? "",
    ourStanding: label(litigationStandingLabel, intake.ourStanding),
    money: decimalNumber(intake.claimAmount),
    claimDescription: intake.claimDescription ?? "",
    barFiling: label(barFilingLabel, intake.barFiling),
    counterclaim: yesNo(intake.counterclaim),
  };
}
function buildIntakeServiceSection(intake: IntakeExportRow): Record<string, unknown> {
  return {
    businessType: intake.businessType ?? "",
    serviceScope: intake.serviceScope ?? "",
    deliverables: intake.deliverables ?? "",
    counselType: intake.counselType ?? "",
    serviceStart: formatDate(intake.serviceStart),
    serviceEnd: formatDate(intake.serviceEnd),
  };
}
function buildIntakeFeeSection(
  intake: IntakeExportRow,
  coUserNames: Map<string, string>
): Record<string, unknown> {
  return {
    feeType: label(feeTypeLabel, intake.feeType),
    feeAmount: decimalNumber(intake.feeAmount),
    contingencyTerms: intake.contingencyTerms ?? "",
    feeSchedule: intake.feeSchedule ?? "",
    feeNote: intake.feeNote ?? "",
    coUsers: intake.coUserIds.map((id) => coUserNames.get(id) ?? id).join("；"),
  };
}
function buildIntakeMetaSection(intake: IntakeExportRow): Record<string, unknown> {
  return {
    owner: intake.ownerUser?.name ?? "",
    parties: formatParties(intake.parties),
    documents: formatDocuments(intake.documents),
    matter: intake.matter
      ? `${intake.matter.firmCaseNo ?? intake.matter.internalCode} ${intake.matter.title}`
      : "",
    declinedReason: intake.declinedReason ?? "",
    createdAt: formatDateTime(intake.createdAt),
    updatedAt: formatDateTime(intake.updatedAt),
  };
}
export function buildIntakeRow(intake: IntakeExportRow, coUserNames: Map<string, string>) {
  return {
    ...buildIntakeClientSection(intake),
    ...buildIntakeProcedureSection(intake),
    ...buildIntakeServiceSection(intake),
    ...buildIntakeFeeSection(intake, coUserNames),
    ...buildIntakeMetaSection(intake)
  };
}


