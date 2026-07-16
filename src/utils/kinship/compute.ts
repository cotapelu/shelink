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

import type { PersonNode, KinshipResult, RelEdge } from "./types";
/**
 * So sánh thứ bậc giữa hai người (cùng bố mẹ hoặc cùng thế hệ)
 * Ưu tiên: Thứ tự sinh (birth_order) -> Năm sinh (birth_year)
 */
import { findBloodKinship } from './bloodGraph';
export { compareSeniority, getDirectAncestorTerm, getDirectDescendantTerm } from './bloodTerms';
function createPersonsMap(persons: PersonNode[]): Map<string, PersonNode> {
  return new Map(persons.map(p => [p.id, p]));
}
function populateMaps(relationships: RelEdge[], parentMap: Map<string, string[]>, spouseMap: Map<string, string[]>): void {
  for (const r of relationships) {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      const p = parentMap.get(r.person_b) ?? []; p.push(r.person_a); parentMap.set(r.person_b, p);
    } else if (r.type === "marriage") {
      const sA = spouseMap.get(r.person_a) ?? []; sA.push(r.person_b); spouseMap.set(r.person_a, sA);
      const sB = spouseMap.get(r.person_b) ?? []; sB.push(r.person_a); spouseMap.set(r.person_b, sB);
    }
  }
}
function buildMaps(persons: PersonNode[], relationships: RelEdge[]): { personsMap: Map<string, PersonNode>; parentMap: Map<string, string[]>; spouseMap: Map<string, string[]> } {
  const personsMap = createPersonsMap(persons);
  const parentMap = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();
  populateMaps(relationships, parentMap, spouseMap);
  return { personsMap, parentMap, spouseMap };
}

function getSpousePairs(spousesA: string[], spousesB: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const sIdA of spousesA) {
    for (const sIdB of spousesB) {
      if (sIdA !== sIdB) pairs.push([sIdA, sIdB]);
    }
  }
  return pairs;
}

function trySpousePairKinship(
  pair: [string, string],
  personsMap: Map<string, PersonNode>,
  parentMap: Map<string, string[]>,
  personA: PersonNode,
  personB: PersonNode
): KinshipResult | null {
  const [sIdA, sIdB] = pair;
  const spouseA = personsMap.get(sIdA);
  const spouseB = personsMap.get(sIdB);
  if (!spouseA || !spouseB) return null;
  const res = findBloodKinship(spouseA, spouseB, personsMap, parentMap);
  if (res) return createBothSpousesResult(res, spouseA, spouseB, personA, personB);
  return null;
}

function checkDirectMarriage(
  personA: PersonNode,
  personB: PersonNode,
  spousesA: string[]
): KinshipResult | null {
  if (!spousesA.includes(personB.id)) return null;
  return {
    aCallsB: personB.gender === "female" ? "Vợ" : "Chồng",
    bCallsA: personA.gender === "female" ? "Vợ" : "Chồng",
    description: "Quan hệ Hôn nhân",
    distance: 0,
    pathLabels: [`${personA.full_name} và ${personB.full_name} là vợ chồng.`],
  };
}


function adjustBloodSiblingTerm(
  personA: PersonNode,
  personB: PersonNode,
  spouseA: PersonNode,
  spouseB: PersonNode,
  aCallsB: string,
  bCallsA: string
): { aCallsB: string; bCallsA: string } {
  const bothMale = personA.gender === "male" && personB.gender === "male" && spouseA.gender === "female" && spouseB.gender === "female";
  const bothFemale = personA.gender === "female" && personB.gender === "female" && spouseA.gender === "male" && spouseB.gender === "male";
  if (bothMale || bothFemale) {
    const term = bothMale ? "Anh em cột chèo" : "Chị em dâu";
    return { aCallsB: term, bCallsA: term };
  }
  return { aCallsB, bCallsA };
}

function maybeAdjustBloodSiblingTerm(
  res: KinshipResult,
  personA: PersonNode,
  personB: PersonNode,
  spouseA: PersonNode,
  spouseB: PersonNode,
  aCallsB: string,
  bCallsA: string
): { aCallsB: string; bCallsA: string } {
  if (!res.description.includes("Anh chị em ruột")) return { aCallsB, bCallsA };
  return adjustBloodSiblingTerm(personA, personB, spouseA, spouseB, aCallsB, bCallsA);
}

function createBothSpousesResult(res: KinshipResult, spouseA: PersonNode, spouseB: PersonNode, personA: PersonNode, personB: PersonNode): KinshipResult {
  const prefixA = personA.gender === "male" ? "Chồng" : "Vợ";
  const prefixB = personB.gender === "male" ? "Chồng" : "Vợ";
  let aCallsB = `${prefixA} của ${res.aCallsB}`;
  let bCallsA = `${prefixB} của ${res.bCallsA}`;
  const adjusted = maybeAdjustBloodSiblingTerm(res, personA, personB, spouseA, spouseB, aCallsB, bCallsA);
  aCallsB = adjusted.aCallsB;
  bCallsA = adjusted.bCallsA;
  const description = `Thông qua hôn nhân của cả ${spouseA.full_name} và ${spouseB.full_name}`;
  const pathLabels = [
    `${personA.full_name} là ${prefixA} của ${spouseA.full_name}`,
    ...res.pathLabels,
    `${personB.full_name} là ${prefixB} của ${spouseB.full_name}`
  ];
  return { ...res, aCallsB, bCallsA, description, pathLabels };
}
function checkViaBothSpouses(spousesA: string[], spousesB: string[], personsMap: Map<string, PersonNode>, parentMap: Map<string, string[]>, personA: PersonNode, personB: PersonNode): KinshipResult | null {
  const pairs = getSpousePairs(spousesA, spousesB);
  for (const pair of pairs) {
    const result = trySpousePairKinship(pair, personsMap, parentMap, personA, personB);
    if (result) return result;
  }
  return null;
}

// ============ Spouse transformation helpers (preserve original logic) ============

const ANCESTOR_PREFIXES = ["Bố", "Mẹ", "Ông", "Bà", "Cụ"] as const;
const UNCLE_TERMS = ["Bác", "Chú", "Cô", "Cậu", "Dì"];

function transformTermWithSuffix(rules: Array<(t: string, s: string) => string | null>, term: string, suffix: string): string {
  for (const rule of rules) {
    const res = rule(term, suffix);
    if (res !== null) return res;
  }
  return term;
}

function transformViaA_aCallsB(term: string, personA: PersonNode): string {
  const suffix = personA.gender === "male" ? " vợ" : " chồng";
  const rules: Array<(t: string, s: string) => string | null> = [
    (t, s) => ANCESTOR_PREFIXES.some(p => t === p || t.startsWith(p)) ? t + s : null,
    (t, s) => t.includes("Anh trai") ? "Anh" + s : null,
    (t, s) => t.includes("Chị gái") ? "Chị" + s : null,
    (t, s) => t === "Em họ" ? "Em (Em họ của " + s + ")" : null,
    (t, s) => t.includes("Em") ? "Em" + s : null,
    (t, s) => (UNCLE_TERMS.includes(t) || t.endsWith(" họ")) ? t.replace(" họ", "") + s : null,
  ];
  return transformTermWithSuffix(rules, term, suffix);
}

function transformViaB_bCallsA(term: string, personB: PersonNode): string {
  const suffix = personB.gender === "male" ? " vợ" : " chồng";
  const rules: Array<(t: string, s: string) => string | null> = [
    (t, s) => ANCESTOR_PREFIXES.some(p => t === p || t.startsWith(p)) ? t + s : null,
    (t, s) => t.includes("Anh trai") ? "Anh" + s : null,
    (t, s) => t.includes("Chị gái") ? "Chị" + s : null,
    (t, s) => t === "Em họ" ? "Em (Em họ của " + s + ")" : null,
    (t, s) => t.includes("Em") ? "Em" + s : null,
    (t, s) => (UNCLE_TERMS.includes(t) || t.endsWith(" họ")) ? t.replace(" họ", "") + s : null,
  ];
  return transformTermWithSuffix(rules, term, suffix);
}

function transformGenderBased(rules: Array<(t: string, g: string) => string | null>, term: string, gender: string): string {
  for (const rule of rules) {
    const res = rule(term, gender);
    if (res !== null) return res;
  }
  return term;
}

function transformViaA_bCallsA(term: string, personA: PersonNode): string {
  const rules: Array<(t: string, g: string) => string | null> = [
    (t, g) => t === "Con" ? (g === "male" ? "Con rể" : "Con dâu") : null,
    (t, g) => t === "Cháu" ? (g === "male" ? "Cháu rể" : "Cháu dâu") : null,
    (t, g) => (t.includes("Anh trai") || t.includes("Chị gái")) ? (g === "male" ? "Anh rể" : "Chị dâu") : null,
    (t, g) => t.includes("Em") ? (g === "male" ? "Em rể" : "Em dâu") : null,
    (t, g) => t === "Chị họ" ? "Anh (Chồng của Chị họ)" : null,
    (t, g) => t === "Anh họ" ? "Chị (Vợ của Anh họ)" : null,
    (t, g) => t === "Chú" ? "Cô" : null,
    (t, g) => t === "Cô" ? "Chú" : null,
    (t, g) => t === "Cậu" ? "Dì" : null,
    (t, g) => t === "Dì" ? "Cậu" : null,
    (t, g) => t === "Bà Cô" ? "Ông Dượng" : null,
  ];
  return transformGenderBased(rules, term, personA.gender);
}

function transformViaB_aCallsB(term: string, personB: PersonNode): string {
  const rules: Array<(t: string, g: string) => string | null> = [
    (t, g) => t === "Con" ? (g === "male" ? "Con rể" : "Con dâu") : null,
    (t, g) => t === "Cháu" ? (g === "male" ? "Cháu rể" : "Cháu dâu") : null,
    (t, g) => (t.includes("Anh trai") || t.includes("Chị gái")) ? (g === "male" ? "Anh rể" : "Chị dâu") : null,
    (t, g) => t.includes("Em") ? (g === "male" ? "Em rể" : "Em dâu") : null,
    (t, g) => t === "Chị họ" ? "Anh (Chồng của Chị họ)" : null,
    (t, g) => t === "Anh họ" ? "Chị (Vợ của Anh họ)" : null,
    (t, g) => t === "Chú" ? "Cô" : null,
    (t, g) => t === "Cô" ? "Chú" : null,
    (t, g) => t === "Cậu" ? "Dì" : null,
    (t, g) => t === "Dì" ? "Cậu" : null,
    (t, g) => t === "Bà Cô" ? "Ông Dượng" : null,
  ];
  return transformGenderBased(rules, term, personB.gender);
}
/**
 * Computes the kinship relationship between two persons.
 * @param a - The first person (PersonNode).
 * @param b - The second person (PersonNode).
 * @param persons - Array of all persons in the graph.
 * @param relationships - Array of relationship edges.
 * @returns The computed KinshipResult, or null if no relationship is found within the data scope.
 */




function tryViaA(personA: PersonNode, personB: PersonNode, personsMap: Map<string, PersonNode>, parentMap: Map<string, string[]>, spousesA: string[]): KinshipResult | null {
  for (const sId of spousesA) {
    if (sId === personB.id) continue;
    const spouseA = personsMap.get(sId);
    if (!spouseA) continue;
    const res = findBloodKinship(spouseA, personB, personsMap, parentMap);
    if (res) {
      const aCallsB = transformViaA_aCallsB(res.aCallsB, personA);
      const bCallsA = transformViaA_bCallsA(res.bCallsA, personA);
      return { ...res, aCallsB, bCallsA, description: `Thông qua hôn nhân của ${spouseA.full_name}`, pathLabels: [`${personA.full_name} là vợ/chồng của ${spouseA.full_name}`, ...res.pathLabels] };
    }
  }
  return null;
}


function tryViaB(personA: PersonNode, personB: PersonNode, personsMap: Map<string, PersonNode>, parentMap: Map<string, string[]>, spousesB: string[]): KinshipResult | null {
  for (const sId of spousesB) {
    if (sId === personA.id) continue;
    const spouseB = personsMap.get(sId);
    if (!spouseB) continue;
    const res = findBloodKinship(personA, spouseB, personsMap, parentMap);
    if (res) {
      const aCallsB = transformViaB_aCallsB(res.aCallsB, personB);
      const bCallsA = transformViaB_bCallsA(res.bCallsA, personB);
      return { ...res, aCallsB, bCallsA, description: `Thông qua hôn nhân của ${spouseB.full_name}`, pathLabels: [...res.pathLabels, `${personB.full_name} là vợ/chồng của ${spouseB.full_name}`] };
    }
  }
  return null;
}


export function computeKinship(personA: PersonNode, personB: PersonNode, persons: PersonNode[], relationships: RelEdge[]): KinshipResult | null {
  if (personA.id === personB.id) return null;
  const { personsMap, parentMap, spouseMap } = buildMaps(persons, relationships);
  const spousesA = spouseMap.get(personA.id) ?? [], spousesB = spouseMap.get(personB.id) ?? [];
  const direct = checkDirectMarriage(personA, personB, spousesA);
  if (direct) return direct;
  const blood = findBloodKinship(personA, personB, personsMap, parentMap);
  if (blood) return blood;
  const viaA = tryViaA(personA, personB, personsMap, parentMap, spousesA);
  if (viaA) return viaA;
  const viaB = tryViaB(personA, personB, personsMap, parentMap, spousesB);
  if (viaB) return viaB;
  const viaBoth = checkViaBothSpouses(spousesA, spousesB, personsMap, parentMap, personA, personB);
  if (viaBoth) return viaBoth;
  return { aCallsB: "Chưa xác định", bCallsA: "Chưa xác định", description: "Không tìm thấy quan hệ trong phạm vi dữ liệu", distance: -1, pathLabels: [] };
}




