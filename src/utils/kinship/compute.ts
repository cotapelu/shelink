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
export function compareSeniority(
  a: PersonNode,
  b: PersonNode,
): "senior" | "junior" | "equal" {
  if (a.id === b.id) return "equal";

  if (a.birth_order != null && b.birth_order != null) {
    if (a.birth_order < b.birth_order) return "senior";
    if (a.birth_order > b.birth_order) return "junior";
  }

  if (a.birth_year != null && b.birth_year != null) {
    if (a.birth_year < b.birth_year) return "senior";
    if (a.birth_year > b.birth_year) return "junior";
  }

  return "equal";
}

// ── Vietnamese Terminology Constants ──────────────────────────────────────

const ANCESTORS = [
  "",
  "Bố/Mẹ",
  "Ông/Bà",
  "Cụ",
  "Kỵ",
  "Sơ",
  "Tiệm",
  "Tiểu",
  "Di",
  "Diễn",
];
const DESCENDANTS = [
  "",
  "Con",
  "Cháu",
  "Chắt",
  "Chít",
  "Chút",
  "Chét",
  "Chót",
  "Chẹt",
];

/**
 * Lấy danh xưng trực hệ vế trên
 */
export function getDirectAncestorTerm(
  depth: number,
  gender: "male" | "female" | "other",
  isPaternal: boolean,
): string {
  if (depth === 1) return gender === "female" ? "Mẹ" : "Bố";
  if (depth === 2) {
    const base = gender === "female" ? "Bà" : "Ông";
    return `${base} ${isPaternal ? "nội" : "ngoại"}`;
  }
  const title = ANCESTORS[depth] || `Tổ đời ${depth}`;
  if (depth === 3) {
    const base = gender === "female" ? "Cụ bà" : "Cụ ông";
    return `${base} ${isPaternal ? "nội" : "ngoại"}`;
  }
  return title;
}

/**
 * Lấy danh xưng trực hệ vế dưới
 */
export function getDirectDescendantTerm(depth: number): string {
  const base = DESCENDANTS[depth] || `Cháu đời ${depth}`;
  return base;
}

// ── Core Algorithm ──────────────────────────────────────────────────────────

/**
 * Giải quyết danh xưng huyết thống giữa A và B
 */

// Helpers for resolveBloodTerms (split to reduce complexity)
function handleDirectLineage(
  depthA: number,
  depthB: number,
  personA: PersonNode,
  personB: PersonNode,
  pathA: PersonNode[],
  pathB: PersonNode[]
): [string, string, string] {
  const genderA = personA.gender;
  const genderB = personB.gender;
  if (depthA === 0) {
    const firstChild = pathB[pathB.length - 1];
    if (!firstChild) return ["Hậu duệ", "Tiền bối", "Quan hệ Trực hệ"];
    const isPaternal = firstChild.gender === "male";
    const bCallsA = getDirectAncestorTerm(depthB, genderA, isPaternal);
    const aCallsB = getDirectDescendantTerm(depthB);
    return [aCallsB, bCallsA, "Quan hệ Trực hệ"];
  }
  const firstChild = pathA[pathA.length - 1];
  if (!firstChild) return ["Tiền bối", "Hậu duệ", "Quan hệ Trực hệ"];
  const isPaternal = firstChild.gender === "male";
  const aCallsB = getDirectAncestorTerm(depthA, genderB, isPaternal);
  const bCallsA = getDirectDescendantTerm(depthA);
  return [aCallsB, bCallsA, "Quan hệ Trực hệ"];
}

function handleSiblingTerms(
  personA: PersonNode,
  personB: PersonNode,
  branchA: PersonNode,
  branchB: PersonNode
): [string, string, string] {
  const genderA = personA.gender;
  const genderB = personB.gender;
  const seniority = compareSeniority(branchA, branchB);
  if (seniority === "senior") {
    return [
      genderB === "female" ? "Em gái" : "Em trai",
      genderA === "female" ? "Chị gái" : "Anh trai",
      "Anh chị em ruột",
    ];
  } else {
    return [
      genderB === "female" ? "Chị gái" : "Anh trai",
      genderA === "female" ? "Em gái" : "Em trai",
      "Anh chị em ruột",
    ];
  }
}

function handleUncleAuntTerms(
  depthA: number,
  depthB: number,
  personA: PersonNode,
  personB: PersonNode,
  branchA: PersonNode,
  branchB: PersonNode,
  pathA: PersonNode[],
  pathB: PersonNode[]
): [string, string, string] {
  const genderA = personA.gender;
  const genderB = personB.gender;
  const seniority = compareSeniority(branchA, branchB);
  const isALineHigher = depthA > depthB;
  const higherDepth = isALineHigher ? depthA : depthB;
  const higherBranch = isALineHigher ? branchA : branchB;
  const lowerPerson = isALineHigher ? personB : personA;
  const lowerGender = lowerPerson.gender;
  const isPaternalSide = higherBranch.gender === "male";
  const genDiff = higherDepth - 1;
  let lowerCallsHigher = "";
  if (isPaternalSide) {
    if (genDiff === 1) {
      lowerCallsHigher = lowerGender === "female" ? "Cô" : "Bác";
    } else if (genDiff === 2) {
      lowerCallsHigher = lowerGender === "female" ? "Bà cô" : "Cụ ông";
    } else {
      const prefix = lowerGender === "female" ? `Bà ${ANCESTORS[genDiff - 1]}` : `Ông ${ANCESTORS[genDiff - 1]}`;
      lowerCallsHigher = prefix;
    }
  } else {
    if (genDiff === 1) {
      lowerCallsHigher = lowerGender === "female" ? "Dì" : "Chú";
    } else if (genDiff === 2) {
      lowerCallsHigher = lowerGender === "female" ? "Bà dì" : "Ông dượng";
    } else {
      const prefix = lowerGender === "female" ? `Bà ${ANCESTORS[genDiff - 1]}` : `Ông ${ANCESTORS[genDiff - 1]}`;
      lowerCallsHigher = prefix;
    }
  }
  const higherCallsLower = getDirectDescendantTerm(higherDepth);
  const description = isPaternalSide ? "Bên Nội (Vế trên)" : "Bên Ngoại (Vế trên)";
  return [lowerCallsHigher, higherCallsLower, description];
}

function handleCrossGenerationalTerms(
  depthA: number,
  depthB: number,
  personA: PersonNode,
  personB: PersonNode,
  branchA: PersonNode,
  branchB: PersonNode
): [string, string, string] {
  const genderA = personA.gender;
  const genderB = personB.gender;
  const seniority = compareSeniority(branchA, branchB);
  const isPaternalA = branchA.gender === "male";
  const genDiffA = depthA - 1;
  const genDiffB = depthB - 1;
  if (genDiffA === 0 || genDiffB === 0) return ["Họ hàng", "Họ hàng", "Quan hệ họ hàng"];
  const depthDiff = Math.abs(genDiffA - genDiffB);
  const maxGen = Math.max(genDiffA, genDiffB);
  if (maxGen > 1 && depthDiff <= 1) {
    if (seniority === "senior") {
      return ["Em họ", genderA === "female" ? "Chị họ" : "Anh họ", `Anh em họ ${isPaternalA ? "Nội" : "Ngoại"}`];
    } else {
      return [genderB === "female" ? "Chị họ" : "Anh họ", "Em họ", `Anh em họ ${isPaternalA ? "Nội" : "Ngoại"}`];
    }
  }
  return ["Họ hàng", "Họ hàng", "Quan hệ họ hàng"];
}

// eslint-disable-next-line max-lines-per-function, max-statements
function resolveBloodTerms(
  depthA: number,
  depthB: number,
  personA: PersonNode,
  personB: PersonNode,
  pathA: PersonNode[],
  pathB: PersonNode[]
): [string, string, string] {
  // Direct lineage
  if (depthA === 0) return handleDirectLineage(depthA, depthB, personA, personB, pathA, pathB);
  if (depthB === 0) {
    const r = handleDirectLineage(depthB, depthA, personB, personA, pathB, pathA);
    return [r[1], r[0], r[2]];
  }

  const branchA = pathA[pathA.length - 1];
  const branchB = pathB[pathB.length - 1];
  if (!branchA || !branchB) return ["Họ hàng", "Họ hàng", "Quan hệ họ hàng"];

  // Siblings
  if (depthA === 1 && depthB === 1) return handleSiblingTerms(personA, personB, branchA, branchB);

  // Uncle/Aunt relationships
  if (depthA > 1 && depthB === 1) return handleUncleAuntTerms(depthA, depthB, personA, personB, branchA, branchB, pathA, pathB);
  if (depthA === 1 && depthB > 1) {
    const r = handleUncleAuntTerms(depthB, depthA, personB, personA, branchB, branchA, pathB, pathA);
    return [r[1], r[0], r[2]];
  }

  // Cousins and distant relations
  return handleCrossGenerationalTerms(depthA, depthB, personA, personB, branchA, branchB);
}

function enqueueParents(
  currentNode: PersonNode,
  depth: number,
  path: PersonNode[],
  parentMap: Map<string, string[]>,
  personsMap: Map<string, PersonNode>,
  queue: { id: string; depth: number; path: PersonNode[] }[]
) {
  const parents = parentMap.get(currentNode.id) ?? [];
  for (const pId of parents) {
    const pNode = personsMap.get(pId);
    if (pNode) {
      queue.push({
        id: pId,
        depth: depth + 1,
        path: [...path, currentNode],
      });
    }
  }
}

function traverseAncestors(
  initialId: string,
  parentMap: Map<string, string[]>,
  personsMap: Map<string, PersonNode>
): Map<string, { depth: number; path: PersonNode[] }> {
  const depths = new Map<string, { depth: number; path: PersonNode[] }>();
  const queue: { id: string; depth: number; path: PersonNode[] }[] = [
    { id: initialId, depth: 0, path: [] },
  ];

  while (queue.length > 0) {
    const { id: currentId, depth, path } = queue.shift()!;
    if (!depths.has(currentId)) {
      depths.set(currentId, { depth, path });

      const currentNode = personsMap.get(currentId);
      if (!currentNode) continue;

      enqueueParents(currentNode, depth, path, parentMap, personsMap, queue);
    }
  }
  return depths;
}

function getAncestryData(
  id: string,
  parentMap: Map<string, string[]>,
  personsMap: Map<string, PersonNode>,
) {
  return traverseAncestors(id, parentMap, personsMap);
}


function findLCA(
  ancA: Map<string, any>,
  ancB: Map<string, any>,
): { lcaId: string | null; minDistance: number } {
  let lcaId: string | null = null;
  let minDistance = Infinity;
  for (const [id, dataA] of ancA) {
    if (ancB.has(id)) {
      const dist = dataA.depth + ancB.get(id)!.depth;
      if (dist < minDistance) {
        minDistance = dist;
        lcaId = id;
      }
    }
  }
  return { lcaId, minDistance };
}

function findBloodKinship(
  personA: PersonNode,
  personB: PersonNode,
  personsMap: Map<string, PersonNode>,
  parentMap: Map<string, string[]>,
): KinshipResult | null {
  const ancA = getAncestryData(personA.id, parentMap, personsMap);
  const ancB = getAncestryData(personB.id, parentMap, personsMap);

  const { lcaId, minDistance } = findLCA(ancA, ancB);
  if (!lcaId) return null;

  const dataA = ancA.get(lcaId)!;
  const dataB = ancB.get(lcaId)!;

  const [aCallsB, bCallsA, description] = resolveBloodTerms(
    dataA.depth,
    dataB.depth,
    personA,
    personB,
    dataA.path,
    dataB.path,
  );

  const lcaName = personsMap.get(lcaId)?.full_name ?? "Tổ tiên chung";
  const pathParts: string[] = [];
  pathParts.push(`${personA.full_name} cách ${lcaName} ${dataA.depth} đời.`);
  pathParts.push(`${personB.full_name} cách ${lcaName} ${dataB.depth} đời.`);

  return {
    aCallsB,
    bCallsA,
    description: `${description} (Tổ tiên chung: ${lcaName})`,
    distance: minDistance,
    pathLabels: pathParts,
  };
}
// eslint-disable-next-line max-lines-per-function, max-statements

// ============ Extracted helpers for computeKinship ============

// Mapping tables for spouse-based transformation (reduce complexity)
const transformAMap: Record<string, (gender: string) => string> = {
  "Con": (g) => g === "male" ? "Con rể" : "Con dâu",
  "Cháu": (g) => g === "male" ? "Cháu rể" : "Cháu dâu",
  "Anh trai": (g) => g === "female" ? "Chị dâu" : "Anh rể",
  "Chị gái": (g) => g === "male" ? "Anh rể" : "Chị dâu",
  "Chị họ": () => "Anh (Chồng của Chị họ)",
  "Anh họ": () => "Chị (Vợ của Anh họ)",
  "Em": (g) => g === "male" ? "Em rể" : "Em dâu",
  "Chú": () => "Cô",
  "Cô": () => "Chú",
  "Cậu": () => "Dì",
  "Dì": () => "Cậu",
  "Bà Cô": () => "Ông Dượng"
};

const suffix = (g: string) => g === "male" ? " vợ" : " chồng";

const transformBMap: Record<string, (gender: string) => string> = {
  "Bố": (g) => "Bố" + suffix(g),
  "Mẹ": (g) => "Mẹ" + suffix(g),
  "Ông": (g) => "Ông" + suffix(g),
  "Bà": (g) => "Bà" + suffix(g),
  "Cụ": (g) => "Cụ" + suffix(g),
  "Anh trai": (g) => "Anh" + suffix(g),
  "Chị gái": (g) => "Chị" + suffix(g),
  "Em họ": (g) => "Em (Em họ của" + suffix(g) + ")",
  "Em": (g) => "Em" + suffix(g),
  "Bác": (g) => "Bác" + suffix(g),
  "Chú": (g) => "Chú" + suffix(g),
  "Cô": (g) => "Cô" + suffix(g),
  "Cậu": (g) => "Cậu" + suffix(g),
  "Dì": (g) => "Dì" + suffix(g),
  "Bác họ": (g) => "Bác" + suffix(g),
  "Chú họ": (g) => "Chú" + suffix(g),
  "Cô họ": (g) => "Cô" + suffix(g),
  "Cậu họ": (g) => "Cậu" + suffix(g),
  "Dì họ": (g) => "Dì" + suffix(g)
};

function buildMaps(
  persons: PersonNode[],
  relationships: RelEdge[]
): { personsMap: Map<string, PersonNode>; parentMap: Map<string, string[]>; spouseMap: Map<string, string[]> } {
  const personsMap = new Map(persons.map(p => [p.id, p]));
  const parentMap = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();
  for (const r of relationships) {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      const p = parentMap.get(r.person_b) ?? [];
      p.push(r.person_a);
      parentMap.set(r.person_b, p);
    } else if (r.type === "marriage") {
      const sA = spouseMap.get(r.person_a) ?? [];
      sA.push(r.person_b);
      spouseMap.set(r.person_a, sA);
      const sB = spouseMap.get(r.person_b) ?? [];
      sB.push(r.person_a);
      spouseMap.set(r.person_b, sB);
    }
  }
  return { personsMap, parentMap, spouseMap };
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

function checkViaSpouse(
  personX: PersonNode,
  personY: PersonNode,
  spousesX: string[],
  personsMap: Map<string, PersonNode>,
  parentMap: Map<string, string[]>,
  transform: (res: KinshipResult, spouse: PersonNode) => KinshipResult
): KinshipResult | null {
  for (const sId of spousesX) {
    const spouse = personsMap.get(sId);
    if (!spouse) continue;
    const res = findBloodKinship(spouse, personY, personsMap, parentMap);
    if (res) return transform(res, spouse);
  }
  return null;
}

function createSpouseResult(
  res: KinshipResult,
  spouseUser: PersonNode,
  spouse: PersonNode,
  targetGender: string,
  ownerGender: string
): KinshipResult {
  const aCallsB = (transformAMap[res.aCallsB] || ((_g) => res.aCallsB))(targetGender);
  const bCallsA = (transformBMap[res.bCallsA] || ((_g) => res.bCallsA))(ownerGender);
  return {
    ...res,
    aCallsB,
    bCallsA,
    description: `Thông qua hôn nhân của ${spouse.full_name}`,
    pathLabels: [`${spouseUser.full_name} là vợ/chồng của ${spouse.full_name}`, ...res.pathLabels],
  };
}

function createBothSpousesResult(
  res: KinshipResult,
  spouseA: PersonNode,
  spouseB: PersonNode,
  personA: PersonNode,
  personB: PersonNode
): KinshipResult {
  const prefixA = personA.gender === "male" ? "Chồng" : "Vợ";
  const prefixB = personB.gender === "male" ? "Chồng" : "Vợ";

  let aCallsB = `${prefixA} của ${res.aCallsB}`;
  let bCallsA = `${prefixB} của ${res.bCallsA}`;

  // Special cases: anh em cot cheo / chi em dau
  if (res.description.includes("Anh chị em ruột")) {
    if (personA.gender === "male" && personB.gender === "male" && spouseA.gender === "female" && spouseB.gender === "female") {
      aCallsB = "Anh em cột chèo";
      bCallsA = "Anh em cột chèo";
    } else if (personA.gender === "female" && personB.gender === "female" && spouseA.gender === "male" && spouseB.gender === "male") {
      aCallsB = "Chị em dâu";
      bCallsA = "Chị em dâu";
    }
  }

  return {
    ...res,
    aCallsB,
    bCallsA,
    description: `Thông qua hôn nhân của cả ${spouseA.full_name} và ${spouseB.full_name}`,
    pathLabels: [
      `${personA.full_name} là ${prefixA} của ${spouseA.full_name}`,
      ...res.pathLabels,
      `${personB.full_name} là ${prefixB} của ${spouseB.full_name}`,
    ],
  };
}

function checkViaBothSpouses(
  spousesA: string[],
  spousesB: string[],
  personsMap: Map<string, PersonNode>,
  parentMap: Map<string, string[]>,
  personA: PersonNode,
  personB: PersonNode
): KinshipResult | null {
  for (const sIdA of spousesA) {
    const spouseA = personsMap.get(sIdA);
    if (!spouseA) continue;
    for (const sIdB of spousesB) {
      if (sIdA === sIdB) continue;
      const spouseB = personsMap.get(sIdB);
      if (!spouseB) continue;
      const res = findBloodKinship(spouseA, spouseB, personsMap, parentMap);
      if (res) return createBothSpousesResult(res, spouseA, spouseB, personA, personB);
    }
  }
  return null;
}
// ============ Spouse transformation helpers (preserve original logic) ============

const ANCESTOR_PREFIXES = ["Bố", "Mẹ", "Ông", "Bà", "Cụ"] as const;
const UNCLE_TERMS = ["Bác", "Chú", "Cô", "Cậu", "Dì"];

function transformViaA_aCallsB(term: string, personA: PersonNode, personB: PersonNode): string {
  const suffix = personA.gender === "male" ? " vợ" : " chồng";
  const rules: Array<(t: string, s: string) => string | null> = [
    (t, s) => ANCESTOR_PREFIXES.some(p => t === p || t.startsWith(p)) ? t + s : null,
    (t, s) => t.includes("Anh trai") ? "Anh" + s : null,
    (t, s) => t.includes("Chị gái") ? "Chị" + s : null,
    (t, s) => t === "Em họ" ? "Em (Em họ của " + s + ")" : null,
    (t, s) => t.includes("Em") ? "Em" + s : null,
    (t, s) => (UNCLE_TERMS.includes(t) || t.endsWith(" họ")) ? t.replace(" họ", "") + s : null,
  ];
  for (const rule of rules) {
    const res = rule(term, suffix);
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
  for (const rule of rules) {
    const res = rule(term, personA.gender);
    if (res !== null) return res;
  }
  return term;
}

function transformViaB_aCallsB(term: string, personB: PersonNode): string {
  // symmetric to transformViaA_bCallsA but using personB.gender
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
  for (const rule of rules) {
    const res = rule(term, personB.gender);
    if (res !== null) return res;
  }
  return term;
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
  for (const rule of rules) {
    const res = rule(term, suffix);
    if (res !== null) return res;
  }
  return term;
}


/**
 * Computes the kinship relationship between two persons.
 * @param a - The first person (PersonNode).
 * @param b - The second person (PersonNode).
 * @param persons - Array of all persons in the graph.
 * @param relationships - Array of relationship edges.
 * @returns The computed KinshipResult, or null if no relationship is found within the data scope.
 */



export function computeKinship(
  personA: PersonNode,
  personB: PersonNode,
  persons: PersonNode[],
  relationships: RelEdge[],
): KinshipResult | null {
  if (personA.id === personB.id) return null;

  const { personsMap, parentMap, spouseMap } = buildMaps(persons, relationships);
  const spousesA = spouseMap.get(personA.id) ?? [];

  // 0. Direct marriage
  const direct = checkDirectMarriage(personA, personB, spousesA);
  if (direct) return direct;

  // 1. Blood relation
  const blood = findBloodKinship(personA, personB, personsMap, parentMap);
  if (blood) return blood;

  // 2. Via A's spouse
  for (const sId of spousesA) {
    if (sId === personB.id) continue;
    const spouseA = personsMap.get(sId);
    if (!spouseA) continue;
    const res = findBloodKinship(spouseA, personB, personsMap, parentMap);
    if (res) {
      const aCallsB = transformViaA_aCallsB(res.aCallsB, personA, personB);
      const bCallsA = transformViaA_bCallsA(res.bCallsA, personA);
      return {
        ...res,
        aCallsB,
        bCallsA,
        description: `Thông qua hôn nhân của ${spouseA.full_name}`,
        pathLabels: [`${personA.full_name} là vợ/chồng của ${spouseA.full_name}`, ...res.pathLabels],
      };
    }
  }

  // 3. Via B's spouse
  const spousesB = spouseMap.get(personB.id) ?? [];
  for (const sId of spousesB) {
    if (sId === personA.id) continue;
    const spouseB = personsMap.get(sId);
    if (!spouseB) continue;
    const res = findBloodKinship(personA, spouseB, personsMap, parentMap);
    if (res) {
      const aCallsB = transformViaB_aCallsB(res.aCallsB, personB);
      const bCallsA = transformViaB_bCallsA(res.bCallsA, personB);
      return {
        ...res,
        aCallsB,
        bCallsA,
        description: `Thông qua hôn nhân của ${spouseB.full_name}`,
        pathLabels: [...res.pathLabels, `${personB.full_name} là vợ/chồng của ${spouseB.full_name}`],
      };
    }
  }

  // 4. Via both spouses
  const viaBoth = checkViaBothSpouses(spousesA, spousesB, personsMap, parentMap, personA, personB);
  if (viaBoth) return viaBoth;

  return {
    aCallsB: "Chưa xác định",
    bCallsA: "Chưa xác định",
    description: "Không tìm thấy quan hệ trong phạm vi dữ liệu",
    distance: -1,
    pathLabels: [],
  };
}


