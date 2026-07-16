import type { Prisma, PartyRole, LitigationStanding, MatterCategory, MatterStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ============== Types ==============
export type ConflictHitDraft = {
  hitType: "HISTORICAL_PARTY";
  targetType: "Matter";
  targetId: string;
  matchedName: string;
  matchedField: "name" | "idNumber";
  matchedValue: string;
  matchedRatio: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "BLOCKING";
  reason: string;
  matterInfo: MatterInfoForHit;
};

export type MatterInfoForHit = {
  matterId: string;
  internalCode: string;
  title: string;
  category: MatterCategory;
  status: MatterStatus;
  intakeDate: Date | null;
  causeText: string | null;
  ownerName: string | null;
  partyRole: PartyRole;
  partyStanding: LitigationStanding | null;
};

export type QueryItem = {
  name: string;
  idNumber?: string;
  role: PartyRole;
};

export type ConflictCheckResult = {
  hits: ConflictHitDraft[];
  sameNameClients: SameNameClient[];
  idMatchedClients: IdMatchedClient[];
};

export type SameNameClient = {
  clientId: string;
  name: string;
};

export type IdMatchedClient = {
  clientId: string;
  name: string;
  idNumber: string;
};

// ============== Query & Select ==============
const matterInfoSelect = {
  id: true,
  internalCode: true,
  title: true,
  category: true,
  status: true,
  intakeDate: true,
  cause: { select: { name: true } },
  causeFreeText: true,
  owner: { select: { name: true } }
} as const;

export type SelectedMatterInfo = Prisma.MatterGetPayload<{ select: typeof matterInfoSelect }>;

// ============== Utilities ==============
export function toMatterInfo(
  matter: SelectedMatterInfo,
  partyRole: PartyRole,
  partyStanding: LitigationStanding | null
): MatterInfoForHit {
  return {
    matterId: matter.id,
    internalCode: matter.internalCode,
    title: matter.title,
    category: matter.category,
    status: matter.status,
    intakeDate: matter.intakeDate,
    causeText: matter.cause?.name ?? matter.causeFreeText ?? null,
    ownerName: matter.owner?.name ?? null,
    partyRole,
    partyStanding
  };
}

export function roleLabel(role: PartyRole) {
  switch (role) {
    case "CLIENT_PARTY": return "委托方";
    case "OPPOSING_PARTY": return "对方";
    case "THIRD_PARTY": return "第三人";
    case "CO_LITIGANT": return "共同诉讼人";
    case "AGENT": return "代理人";
    case "WITNESS": return "证人";
    default: return "当事人";
  }
}

export const SEV_ORDER = { LOW: 0, MEDIUM: 1, HIGH: 2, BLOCKING: 3 } as const;
export const SEV_BY_ORDER = ["LOW", "MEDIUM", "HIGH", "BLOCKING"] as const;

export function bumpSeverity(s: ConflictHitDraft["severity"]): ConflictHitDraft["severity"] {
  return SEV_BY_ORDER[Math.min(SEV_ORDER[s] + 1, 3)];
}

export function pickSeverity(candidateRole: PartyRole, historyRole: PartyRole): ConflictHitDraft["severity"] {
  if (candidateRole === "THIRD_PARTY" || historyRole === "THIRD_PARTY") return "MEDIUM";
  const comboMap: Record<string, ConflictHitDraft["severity"]> = {
    "OPPOSING_PARTY|CLIENT_PARTY": "BLOCKING",
    "CLIENT_PARTY|OPPOSING_PARTY": "HIGH",
    "OPPOSING_PARTY|OPPOSING_PARTY": "LOW",
    "CLIENT_PARTY|CLIENT_PARTY": "LOW",
  };
  return comboMap[`${candidateRole}|${historyRole}`] ?? "MEDIUM";
}

// ============== DB fetchers ==============
export function buildPartyWhere(name: string | null, idNumber: string | null): Prisma.PartyWhereInput[] {
  const where: Prisma.PartyWhereInput[] = [];
  if (name) where.push({ name });
  if (idNumber) where.push({ idNumber });
  return where;
}

export async function fetchExactParties(where: Prisma.PartyWhereInput[]): Promise<any[]> {
  if (where.length === 0) return [];
  return await prisma.party.findMany({
    where: { OR: where, matterId: { not: null }, matter: { deletedAt: null } },
    select: { id: true, name: true, idNumber: true, role: true, standing: true, matter: { select: matterInfoSelect } }
  });
}

export async function fetchFuzzyParties(name: string): Promise<any[]> {
  if (name.length < 3) return [];
  return await prisma.party.findMany({
    where: { matterId: { not: null }, matter: { deletedAt: null }, name: { contains: name, mode: "insensitive" }, NOT: { name } },
    select: { id: true, name: true, role: true, standing: true, matter: { select: matterInfoSelect } },
    take: 20
  });
}

export async function fetchClientsWithMatters(name?: string, idNumber?: string): Promise<any[]> {
  const clientWhere: Prisma.ClientWhereInput[] = [];
  if (name) clientWhere.push({ name });
  if (idNumber) clientWhere.push({ idNumber });
  if (name && name.length >= 3) clientWhere.push({ name: { contains: name, mode: "insensitive" } });
  if (clientWhere.length === 0) return [];

  return await prisma.client.findMany({
    where: { deletedAt: null, OR: clientWhere },
    select: {
      id: true, name: true, idNumber: true,
      matters: { where: { deletedAt: null }, select: matterInfoSelect },
      matterLinks: { where: { matter: { deletedAt: null } }, select: { matter: { select: matterInfoSelect } } }
    }
  });
}

// ============== Hit builders ==============
function buildExactHitIdData(p: any, candidateRole: PartyRole): { matterInfo: MatterInfoForHit; sev: ConflictHitDraft['severity']; matchedField: 'idNumber'; matchedValue: string; reason: string } | null {
  if (!p.matter || !p.idNumber) return null;
  const matterInfo = toMatterInfo(p.matter, p.role, p.standing);
  const sev = bumpSeverity(pickSeverity(candidateRole, p.role));
  return { matterInfo, sev, matchedField: 'idNumber', matchedValue: p.idNumber, reason: `Số ID card / mã số thuế của案件「${p.matter.internalCode}」trong ${roleLabel(p.role)}「${p.name}」giống nhau` };
}

function buildExactHitNameData(p: any, candidateRole: PartyRole, queryName: string): { matterInfo: MatterInfoForHit; sev: ConflictHitDraft['severity']; matchedField: 'name'; matchedValue: string; reason: string } | null {
  if (!p.matter || p.name !== queryName) return null;
  const matterInfo = toMatterInfo(p.matter, p.role, p.standing);
  const sev = pickSeverity(candidateRole, p.role);
  return { matterInfo, sev, matchedField: 'name', matchedValue: queryName, reason: `Trùng tên với ${roleLabel(p.role)}「${p.name}」trong案件「${p.matter.internalCode}」` };
}

export function createExactHit(p: any, candidateRole: PartyRole, matchType: 'id' | 'name', queryName?: string): ConflictHitDraft | null {
  const data = matchType === 'id' ? buildExactHitIdData(p, candidateRole) : buildExactHitNameData(p, candidateRole, queryName!);
  if (!data) return null;
  return { hitType: "HISTORICAL_PARTY", targetType: "Matter", targetId: p.matter.id, matchedName: p.name, matchedField: data.matchedField, matchedValue: data.matchedValue, matchedRatio: 1, severity: data.sev, reason: data.reason, matterInfo: data.matterInfo };
}

export function createFuzzyHit(p: any, candidateRole: PartyRole, queryName: string): ConflictHitDraft | null {
  if (!p.matter) return null;
  const matterInfo = toMatterInfo(p.matter, p.role, p.standing);
  const ratio = queryName.length / p.name.length;
  return { hitType: "HISTORICAL_PARTY", targetType: "Matter", targetId: p.matter.id, matchedName: p.name, matchedField: 'name', matchedValue: queryName, matchedRatio: ratio, severity: 'LOW', reason: `Tên tương tự với ${roleLabel(p.role)}「${p.name}」trong案件「${p.matter.internalCode}」`, matterInfo };
}

// ============== Party-level processors ==============
export function processExactMatches(q: QueryItem, partiesExact: any[]): ConflictHitDraft[] {
  const hits: ConflictHitDraft[] = [];
  for (const p of partiesExact) {
    if (q.idNumber && p.idNumber && p.idNumber === q.idNumber) {
      const hit = createExactHit(p, q.role, 'id', q.name);
      if (hit) hits.push(hit);
    }
    if (q.name && p.name === q.name) {
      const hit = createExactHit(p, q.role, 'name', q.name);
      if (hit) hits.push(hit);
    }
  }
  return hits;
}

export async function processFuzzyMatchesAsync(q: QueryItem): Promise<ConflictHitDraft[]> {
  if (!q.name || q.name.length < 3) return [];
  const partiesFuzzy = await fetchFuzzyParties(q.name);
  const hits: ConflictHitDraft[] = [];
  for (const p of partiesFuzzy) {
    const hit = createFuzzyHit(p, q.role, q.name);
    if (hit) hits.push(hit);
  }
  return hits;
}

// ============== Utility ==============
export function deduplicateAndSort(hits: ConflictHitDraft[]): ConflictHitDraft[] {
  const dedup = new Map<string, ConflictHitDraft>();
  for (const h of hits) {
    const key = `${h.targetId}|${h.matchedField}|${h.matchedValue}`;
    const existing = dedup.get(key);
    if (!existing || SEV_ORDER[h.severity] > SEV_ORDER[existing.severity]) dedup.set(key, h);
  }
  return Array.from(dedup.values()).sort((a, b) => SEV_ORDER[b.severity] - SEV_ORDER[a.severity]);
}
