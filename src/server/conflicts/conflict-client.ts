import {
  ConflictHitDraft,
  QueryItem,
  toMatterInfo,
  pickSeverity,
  bumpSeverity,
  fetchClientsWithMatters,
  processExactMatches,
  fetchExactParties,
  buildPartyWhere,
  processFuzzyMatchesAsync,
  deduplicateAndSort,
  ConflictCheckResult
} from "./helpers";
import type { PartyRole } from "@prisma/client";

// ============== Client hit processors ==============
export function extractClientIdHits(c: any, candidateRole: PartyRole, queryIdNumber: string): ConflictHitDraft[] {
  const hits: ConflictHitDraft[] = [];
  const matters = [...c.matters, ...c.matterLinks.map((l: any) => l.matter)].filter(
    (m: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === m.id) === i
  );
  for (const m of matters) {
    if (!c.idNumber || c.idNumber !== queryIdNumber) continue;
    const matterInfo = toMatterInfo(m, 'CLIENT_PARTY', null);
    const sev = bumpSeverity(pickSeverity(candidateRole, 'CLIENT_PARTY'));
    hits.push({
      hitType: "HISTORICAL_PARTY", targetType: "Matter", targetId: m.id,
      matchedName: c.name, matchedField: 'idNumber', matchedValue: queryIdNumber,
      matchedRatio: 1, severity: sev,
      reason: `Số ID card / mã số thuế trùng với khách hàng「${c.name}」của案件「${m.internalCode}」`,
      matterInfo
    });
  }
  return hits;
}

export function collectClientExactNameHits(c: any, candidateRole: PartyRole, queryName: string): ConflictHitDraft[] {
  const hits: ConflictHitDraft[] = [];
  const matters = [...c.matters, ...c.matterLinks.map((l: any) => l.matter)].filter(
    (m: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === m.id) === i
  );
  if (c.name !== queryName) return hits;
  const sev = pickSeverity(candidateRole, 'CLIENT_PARTY');
  for (const m of matters) {
    const matterInfo = toMatterInfo(m, 'CLIENT_PARTY', null);
    hits.push({
      hitType: "HISTORICAL_PARTY", targetType: "Matter", targetId: m.id,
      matchedName: c.name, matchedField: 'name', matchedValue: queryName,
      matchedRatio: 1, severity: sev,
      reason: `Trùng tên với khách hàng「${c.name}」của案件「${m.internalCode}」`,
      matterInfo
    });
  }
  return hits;
}

export function collectClientFuzzyNameHits(c: any, candidateRole: PartyRole, queryName: string): ConflictHitDraft[] {
  const hits: ConflictHitDraft[] = [];
  if (queryName.length < 3) return hits;
  const matters = [...c.matters, ...c.matterLinks.map((l: any) => l.matter)].filter(
    (m: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === m.id) === i
  );
  for (const m of matters) {
    if (c.name === queryName) continue;
    const ratio = queryName.length / c.name.length;
    const matterInfo = toMatterInfo(m, 'CLIENT_PARTY', null);
    hits.push({
      hitType: "HISTORICAL_PARTY", targetType: "Matter", targetId: m.id,
      matchedName: c.name, matchedField: 'name', matchedValue: queryName,
      matchedRatio: ratio, severity: 'LOW',
      reason: `Tên tương tự với khách hàng「${c.name}」của案件「${m.internalCode}」`,
      matterInfo
    });
  }
  return hits;
}

export function extractClientNameHits(c: any, candidateRole: PartyRole, queryName: string): ConflictHitDraft[] {
  return [
    ...collectClientExactNameHits(c, candidateRole, queryName),
    ...collectClientFuzzyNameHits(c, candidateRole, queryName)
  ];
}

export function processClientMatch(c: any, candidateRole: PartyRole, queryName?: string, queryIdNumber?: string): ConflictHitDraft[] {
  const hits: ConflictHitDraft[] = [];
  if (queryIdNumber && c.idNumber && c.idNumber === queryIdNumber) {
    hits.push(...extractClientIdHits(c, candidateRole, queryIdNumber));
  }
  if (queryName) {
    hits.push(...extractClientNameHits(c, candidateRole, queryName));
  }
  return hits;
}

export function createClientHits(clients: any[], candidateRole: PartyRole, queryName?: string, queryIdNumber?: string): ConflictHitDraft[] {
  const hits: ConflictHitDraft[] = [];
  for (const c of clients) {
    hits.push(...processClientMatch(c, candidateRole, queryName, queryIdNumber));
  }
  return hits;
}

export function processClientMatches(q: QueryItem): Promise<ConflictHitDraft[]> {
  return fetchClientsWithMatters(q.name, q.idNumber).then(clients => createClientHits(clients, q.role, q.name, q.idNumber));
}

// ============== Core orchestrators ==============
export async function processQuery(q: QueryItem): Promise<ConflictHitDraft[]> {
  const name = q.name.trim();
  const idNumber = q.idNumber?.trim() || null;
  if (!name && !idNumber) return [];

  const partyWhere = buildPartyWhere(name, idNumber);
  const partiesExact = await fetchExactParties(partyWhere);

  const exactHits = processExactMatches(q, partiesExact);
  const fuzzyHits = await processFuzzyMatchesAsync(q);
  const clientHits = await processClientMatches(q);

  return [...exactHits, ...fuzzyHits, ...clientHits];
}

export async function runConflictCheck(queries: QueryItem[]): Promise<ConflictCheckResult> {
  const allHits: ConflictHitDraft[] = [];
  const sameNameClients = new Map<string, { clientId: string; name: string }>();
  const idMatchedClients = new Map<string, { clientId: string; name: string; idNumber: string }>();

  for (const q of queries) {
    const hits = await processQuery(q);
    allHits.push(...hits);
  }

  const sortedHits = deduplicateAndSort(allHits);

  return {
    hits: sortedHits,
    sameNameClients: Array.from(sameNameClients.values()),
    idMatchedClients: Array.from(idMatchedClients.values())
  };
}
