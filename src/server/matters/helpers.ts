import { LitigationStanding, PartyRole, PartyType } from "@prisma/client";
import type { MatterCreateInput } from "./schemas";

export type NewProcedurePartyInput = {
  existingPartyId?: string | null;
  name: string;
  role: PartyRole;
  partyType: PartyType;
  idNumber?: string;
  enterpriseSocialCode?: string;
  standings: LitigationStanding[];
};

export function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" ? null : v;
  }
  return out as T;
}

export function clientTypeToPartyType(
  type: "INDIVIDUAL" | "COMPANY" | "ORGANIZATION"
): PartyType {
  if (type === "INDIVIDUAL") return "NATURAL_PERSON";
  if (type === "COMPANY") return "COMPANY";
  return "OTHER_ORG";
}

export function normalizeLitigationStanding(
  standing: LitigationStanding
): LitigationStanding {
  if (standing === "JOINT_PLAINTIFF") return "PLAINTIFF";
  if (standing === "JOINT_DEFENDANT") return "DEFENDANT";
  return standing;
}

export function normalizeProcedureParties(
  rows: { partyId: string; standing: LitigationStanding }[]
) {
  const standingValues = new Set(Object.values(LitigationStanding));
  const seen = new Set<string>();
  return rows
    .filter((row) => row.partyId && standingValues.has(row.standing))
    .map((row) => ({
      ...row,
      standing: normalizeLitigationStanding(row.standing)
    }))
    .filter((row) => {
      const key = `${row.partyId}:${row.standing}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function normalizeNewProcedureParties(
  rows: NewProcedurePartyInput[]
) {
  const standingValues = new Set(Object.values(LitigationStanding));
  const roleValues = new Set(Object.values(PartyRole));
  const partyTypeValues = new Set(Object.values(PartyType));
  return rows
    .map((row) => ({
      existingPartyId: row.existingPartyId || null,
      name: row.name.trim(),
      role: row.role,
      partyType: row.partyType,
      idNumber: row.idNumber?.trim() ?? "",
      enterpriseSocialCode: row.enterpriseSocialCode?.trim() ?? "",
      standings: [
        ...new Set(
          row.standings
            .filter((standing) => standingValues.has(standing))
            .map((standing) => normalizeLitigationStanding(standing))
        )
      ]
    }))
    .filter(
      (row) =>
        row.name &&
        roleValues.has(row.role) &&
        partyTypeValues.has(row.partyType) &&
        row.standings.length > 0 &&
        (row.partyType === "NATURAL_PERSON"
          ? row.idNumber
          : row.enterpriseSocialCode)
    );
}

// Build helpers for matter creation
export function buildClientLinks(primaryClientId: string, clientIds: string[]) {
  return {
    create: clientIds.map((cid, idx) => ({
      clientId: cid,
      isPrimary: idx === 0,
      label: idx === 0 ? "Khách hàng chính" : `Bên ủy thác ${idx + 1}`
    }))
  };
}

export function buildParties(parties: MatterCreateInput["parties"] = []) {
  return {
    create: parties.map((p) =>
      emptyToNull({
        role: p.role,
        ordinal: p.ordinal,
        name: p.name,
        partyType: p.partyType,
        idNumber: p.idNumber,
        phone: p.phone,
        address: p.address,
        legalRep: p.legalRep,
        contactName: p.contactName,
        enterpriseSocialCode: p.enterpriseSocialCode,
        enterpriseName: p.enterpriseName,
        notes: p.notes
      })
    )
  };
}

export function buildProcedure(
  firstProcedure: MatterCreateInput["firstProcedure"]
) {
  return {
    create: {
      type: firstProcedure.type,
      customLabel: firstProcedure.customLabel || null,
      engagement: "ENGAGED" as const,
      order: 1,
      caseNumber: firstProcedure.caseNumber || null,
      handlingAgency: firstProcedure.handlingAgency || null,
      acceptedAt: firstProcedure.acceptedAt,
      status: "IN_PROGRESS" as const
    }
  };
}

export function buildMatterCreateData(
  data: MatterCreateInput,
  userId: string,
  primaryClientId: string,
  internalCode: string,
  firmCaseNo: string
) {
  return {
    internalCode,
    firmCaseNo,
    title: data.title,
    category: data.category,
    ownerId: userId,
    ...emptyToNull({
      causeId: data.causeId,
      causeFreeText: data.causeFreeText
    }),
    claimAmount: data.claimAmount ?? undefined,
    ourStanding: data.ourStanding,
    counterclaimAsPlaintiff: data.counterclaimAsPlaintiff,
    counterclaimAsDefendant: data.counterclaimAsDefendant,
    intakeDate: data.intakeDate ?? new Date(),
    primaryClientId,
    members: { create: { userId, role: "LEAD" } },
    clientLinks: buildClientLinks(primaryClientId, data.clientIds),
    parties: buildParties(data.parties),
    procedures: buildProcedure(data.firstProcedure),
    firstAcceptedAt: data.firstProcedure.acceptedAt
  } as any;
}
