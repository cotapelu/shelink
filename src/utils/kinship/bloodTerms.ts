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

function handleDirectLineageAncestor(
  depthB: number,
  personA: PersonNode,
  personB: PersonNode,
  pathB: PersonNode[]
): [string, string, string] {
  const firstChild = pathB[pathB.length - 1];
  if (!firstChild) return ["Hậu duệ", "Tiền bối", "Quan hệ Trực hệ"];
  const isPaternal = firstChild.gender === "male";
  const bCallsA = getDirectAncestorTerm(depthB, personA.gender, isPaternal);
  const aCallsB = getDirectDescendantTerm(depthB);
  return [aCallsB, bCallsA, "Quan hệ Trực hệ"];
}

function handleDirectLineageDescendant(
  depthA: number,
  personA: PersonNode,
  personB: PersonNode,
  pathA: PersonNode[]
): [string, string, string] {
  const firstChild = pathA[pathA.length - 1];
  if (!firstChild) return ["Tiền bối", "Hậu duệ", "Quan hệ Trực hệ"];
  const isPaternal = firstChild.gender === "male";
  const aCallsB = getDirectAncestorTerm(depthA, personB.gender, isPaternal);
  const bCallsA = getDirectDescendantTerm(depthA);
  return [aCallsB, bCallsA, "Quan hệ Trực hệ"];
}

function handleDirectLineage(
  depthA: number,
  depthB: number,
  personA: PersonNode,
  personB: PersonNode,
  pathA: PersonNode[],
  pathB: PersonNode[]
): [string, string, string] {
  if (depthA === 0) {
    return handleDirectLineageAncestor(depthB, personA, personB, pathB);
  } else {
    return handleDirectLineageDescendant(depthA, personA, personB, pathA);
  }
}


function handleSiblingTerms(
  personA: PersonNode,
  personB: PersonNode,
  branchA: PersonNode,
  branchB: PersonNode
): [string, string, string] {
  const seniority = compareSeniority(branchA, branchB);
  const gA = personA.gender, gB = personB.gender;
  if (seniority === "senior") {
    return [gB === "female" ? "Em gái" : "Em trai", gA === "female" ? "Chị gái" : "Anh trai", "Anh chị em ruột"];
  } else {
    return [gB === "female" ? "Chị gái" : "Anh trai", gA === "female" ? "Em gái" : "Em trai", "Anh chị em ruột"];
  }
}



function getPaternalUncleAuntTerm(genDiff: number, lowerGender: string): string {
  if (genDiff === 1) return lowerGender === "female" ? "Cô" : "Bác";
  if (genDiff === 2) return lowerGender === "female" ? "Bà cô" : "Cụ ông";
  return lowerGender === "female" ? `Bà ${ANCESTORS[genDiff - 1]}` : `Ông ${ANCESTORS[genDiff - 1]}`;
}

function getMaternalUncleAuntTerm(genDiff: number, lowerGender: string): string {
  if (genDiff === 1) return lowerGender === "female" ? "Dì" : "Chú";
  if (genDiff === 2) return lowerGender === "female" ? "Bà dì" : "Ông dượng";
  return lowerGender === "female" ? `Bà ${ANCESTORS[genDiff - 1]}` : `Ông ${ANCESTORS[genDiff - 1]}`;
}



function computeUncleAuntCommon(
  depthA: number,
  depthB: number,
  personA: PersonNode,
  personB: PersonNode,
  branchA: PersonNode,
  branchB: PersonNode
) {
  const isALineHigher = depthA > depthB;
  const higherDepth = isALineHigher ? depthA : depthB;
  const higherBranch = isALineHigher ? branchA : branchB;
  const lowerGender = (isALineHigher ? personB : personA).gender;
  const isPaternalSide = higherBranch.gender === "male";
  const genDiff = higherDepth - 1;
  return { isALineHigher, higherDepth, higherBranch, lowerGender, isPaternalSide, genDiff };
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
  const common = computeUncleAuntCommon(depthA, depthB, personA, personB, branchA, branchB);
  const lowerCallsHigher = common.isPaternalSide
    ? getPaternalUncleAuntTerm(common.genDiff, common.lowerGender)
    : getMaternalUncleAuntTerm(common.genDiff, common.lowerGender);
  const higherCallsLower = getDirectDescendantTerm(common.higherDepth);
  const description = common.isPaternalSide ? "Bên Nội (Vế trên)" : "Bên Ngoại (Vế trên)";
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
  const genderA = personA.gender, genderB = personB.gender;
  const seniority = compareSeniority(branchA, branchB);
  const isPaternalA = branchA.gender === "male";
  const genDiffA = depthA - 1, genDiffB = depthB - 1;
  if (genDiffA === 0 || genDiffB === 0) return ["Họ hàng", "Họ hàng", "Quan hệ họ hàng"];
  if (Math.max(genDiffA, genDiffB) > 1 && Math.abs(genDiffA - genDiffB) <= 1) {
    return seniority === "senior"
      ? ["Em họ", genderA === "female" ? "Chị họ" : "Anh họ", `Anh em họ ${isPaternalA ? "Nội" : "Ngoại"}`]
      : [genderB === "female" ? "Chị họ" : "Anh họ", "Em họ", `Anh em họ ${isPaternalA ? "Nội" : "Ngoại"}`];
  }
  return ["Họ hàng", "Họ hàng", "Quan hệ họ hàng"];
}




// eslint-disable-next-line max-lines-per-function, max-statements
export function resolveBloodTerms(
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

  // Siblings (both depth 1)
  if (depthA + depthB === 2) return handleSiblingTerms(personA, personB, branchA, branchB);

  // Uncle/Aunt relationships
  if (depthA > 1 && depthB === 1) return handleUncleAuntTerms(depthA, depthB, personA, personB, branchA, branchB, pathA, pathB);
  if (depthA === 1 && depthB > 1) {
    const r = handleUncleAuntTerms(depthB, depthA, personB, personA, branchB, branchA, pathB, pathA);
    return [r[1], r[0], r[2]];
  }

  // Cross-generational (cousins, etc.)
  return handleCrossGenerationalTerms(depthA, depthB, personA, personB, branchA, branchB);
}




