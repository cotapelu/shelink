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
 * Format dùng chung cho row export (thủ tục, các bên, liên hệ, tài liệu, vụ án liên quan).
 * THUẦN — tách từ matters-export-rows.ts (AUTO-67b).
 */
import { type LitigationStanding, type PartyRole, type PartyType } from "@prisma/client";
import { litigationStandingLabel, partyTypeLabel, procedureTypeLabel } from "@/lib/enums";
import { formatDate, label } from "./matters-export-formatters";
import { partyRoleLabel, procedureOutcomeLabel, procedureStatusLabel } from "./matters-export-labels";
import type { MatterExportRow } from "./matters-export-includes";

export function formatProcedureSummary(procedures: MatterExportRow["procedures"]) {
  return procedures
    .map((procedure) =>
      [
        label(procedureTypeLabel, procedure.type),
        procedure.customLabel,
        procedure.caseNumber,
        procedure.handlingAgency,
        procedure.status ? procedureStatusLabel[procedure.status] : "",
        procedure.acceptedAt ? `Tiếp nhận: ${formatDate(procedure.acceptedAt)}` : "",
        procedure.concludedAt ? `Kết thúc: ${formatDate(procedure.concludedAt)}` : "",
        procedure.outcome ? `Kết quả: ${procedureOutcomeLabel[procedure.outcome]}` : ""
      ].filter(Boolean).join(" / ")
    )
    .join("；");
}

export function formatParties(parties: { role: PartyRole; standing: LitigationStanding | null; partyType: PartyType; name: string; idNumber: string | null; enterpriseSocialCode: string | null; phone: string | null; address: string | null; legalRep: string | null; contactName: string | null; notes: string | null }[]) {
  return parties
    .map((party) => `${partyRoleLabel[party.role]}: ${formatParty(party)}`)
    .join("; ");
}

export type PartyLike = {
  standing?: LitigationStanding | null;
  partyType: PartyType;
  idNumber?: string | null;
  enterpriseSocialCode?: string | null;
  phone?: string | null;
  legalRep?: string | null;
  contactName?: string | null;
  address?: string | null;
  notes?: string | null;
};

export function partyIdentityLines(party: PartyLike): string[] {
  return [
    label(litigationStandingLabel, party.standing),
    partyTypeLabel[party.partyType],
    party.idNumber ? `Số giấy tờ: ${party.idNumber}` : "",
    party.enterpriseSocialCode ? `Mã số thuế: ${party.enterpriseSocialCode}` : ""
  ];
}

function partyContactLines(party: PartyLike): string[] {
  return [
    party.phone ? `Điện thoại: ${party.phone}` : "",
    party.legalRep ? `Người đại diện: ${party.legalRep}` : "",
    party.contactName ? `Người liên hệ: ${party.contactName}` : "",
    party.address ? `Địa chỉ: ${party.address}` : "",
    party.notes ? `Ghi chú: ${party.notes}` : ""
  ];
}

function partyDetailLines(party: PartyLike): string[] {
  return [...partyIdentityLines(party), ...partyContactLines(party)].filter(Boolean);
}

export function formatParty(party: PartyLike & { name: string }): string {
  const detail = partyDetailLines(party);
  return detail.length > 0 ? `${party.name} (${detail.join(", ")})` : party.name;
}

export function formatContacts(
  contacts: { name: string; title: string | null; phone: string | null; email: string | null; isPrimary: boolean }[]
) {
  return contacts
    .map((contact) =>
      [
        contact.isPrimary ? "Chính" : "",
        contact.name,
        contact.title,
        contact.phone,
        contact.email
      ].filter(Boolean).join(" / ")
    )
    .join("；");
}

export function formatDocuments(documents: { name: string; category: string; createdAt: Date }[]) {
  return documents
    .map((doc) => `${doc.name}（${doc.category}，${formatDate(doc.createdAt)}）`)
    .join("；");
}

export function formatRelatedMatters(matter: MatterExportRow) {
  const from = matter.linksFrom.map((link) => link.relatedMatter);
  const to = matter.linksTo.map((link) => link.matter);
  return [...from, ...to]
    .map((row) => `${row.firmCaseNo ?? row.internalCode} ${row.title}`)
    .join("；");
}

