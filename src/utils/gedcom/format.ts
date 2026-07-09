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
import type { GedcomPerson, GedcomRelationship } from "./types";

function getMonthName(m: number | null): string {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return m && m >= 1 && m <= 12 ? months[m - 1] : "";
}

export function formatNum(n: number | null): string {
  return n && n > 0 ? String(n).padStart(2, "0") : "";
}

export function buildHeader(): string {
  return "0 HEAD\n1 GEDC\n2 VERS 7.0\n1 SOUR Giapha_OS\n2 NAME Giapha OS\n2 VERS 0.1.0\n";
}

export function formatPersonName(person: GedcomPerson): string {
  if (!person.full_name) return "1 NAME Unknown /Unknown/\n";
  const parts = person.full_name.trim().split(" ");
  const lastName = parts.length > 1 ? parts.pop()! : "";
  const firstName = parts.join(" ");
  return `1 NAME ${firstName} /${lastName}/\n`;
}

export function formatPersonSex(person: GedcomPerson): string {
  if (person.gender === "male") return "1 SEX M\n";
  if (person.gender === "female") return "1 SEX F\n";
  return "1 SEX U\n";
}

export function formatPersonBirth(person: GedcomPerson): string {
  if (!person.birth_year && !person.birth_month && !person.birth_day) return "";
  let s = "1 BIRT\n";
  const day = formatNum(person.birth_day ?? null);
  const mont = getMonthName(person.birth_month ?? null);
  const yea = person.birth_year ? String(person.birth_year) : "";
  const dateParts = [day, mont, yea].filter(Boolean);
  if (dateParts.length > 0) {
    s += `2 DATE ${dateParts.join(" ")}\n`;
  }
  return s;
}

export function formatPersonDeath(person: GedcomPerson): string {
  if (!person.is_deceased) return "";
  let s = "1 DEAT Y\n";
  if (person.death_year || person.death_month || person.death_day) {
    const day = formatNum(person.death_day ?? null);
    const mont = getMonthName(person.death_month ?? null);
    const yea = person.death_year ? String(person.death_year) : "";
    const dateParts = [day, mont, yea].filter(Boolean);
    if (dateParts.length > 0) {
      s += `2 DATE ${dateParts.join(" ")}\n`;
    }
  }
  return s;
}

export function formatPersonNote(person: GedcomPerson): string {
  if (!person.note) return "";
  const lines = person.note.split("\n");
  let s = `1 NOTE ${lines[0]}\n`;
  for (let i = 1; i < lines.length; i++) {
    s += `2 CONT ${lines[i]}\n`;
  }
  return s;
}

export function buildPersonRecord(person: GedcomPerson): string {
  if (!person.id) return "";
  let s = `0 @I${person.id.replace(/-/g, "")}@ INDI\n`;
  s += formatPersonName(person);
  s += formatPersonSex(person);
  s += formatPersonBirth(person);
  s += formatPersonDeath(person);
  s += formatPersonNote(person);
  return s;
}

// eslint-disable-next-line max-lines-per-function
function determineSpouseRoles(pA: GedcomPerson, pB: GedcomPerson): { husb?: string; wife?: string } {
  return {
    husb: pA.gender === "male" ? pA.id : pB.gender === "male" ? pB.id : pA.id,
    wife:
      pA.gender === "female" ? pA.id : pB.gender === "female" ? pB.id : pB.id,
  };
}

function validateMarriage(
  marriage: GedcomRelationship,
  personMap: Map<string, GedcomPerson>
): { husb?: string; wife?: string } | null {
  if (!marriage.person_a || !marriage.person_b) return null;
  const pA = personMap.get(marriage.person_a!);
  const pB = personMap.get(marriage.person_b!);
  if (!pA || !pB || !pA.id || !pB.id) return null;
  return determineSpouseRoles(pA, pB);
}

function buildInitialFamilies(
  marriages: GedcomRelationship[],
  personMap: Map<string, GedcomPerson>
): { id: string; husb?: string; wife?: string; children: string[] }[] {
  let familyCounter = 1;
  const families: { id: string; husb?: string; wife?: string; children: string[] }[] = [];
  for (const marriage of marriages) {
    const roles = validateMarriage(marriage, personMap);
    if (!roles) continue;
    families.push({
      id: `F${familyCounter++}`,
      husb: roles.husb,
      wife: roles.wife,
      children: [],
    });
  }
  return families;
}

function createFamilyForParent(parentId: string, personMap: Map<string, GedcomPerson>): { id: string; husb?: string; wife?: string; children: string[] } {
  const pP = personMap.get(parentId)!;
  return {
    id: `F${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
    husb: (pP.gender as string) === "male" ? parentId : undefined,
    wife: (pP.gender as string) === "female" ? parentId : undefined,
    children: [],
  };
}

function processChildRelationship(
  families: { id: string; husb?: string; wife?: string; children: string[] }[],
  childRel: GedcomRelationship,
  personMap: Map<string, GedcomPerson>
) {
  const parentId = childRel.person_a;
  const childId = childRel.person_b;
  if (!parentId || !childId) return;
  let fam = families.find((f) => f.husb === parentId || f.wife === parentId);
  if (!fam) {
    const pP = personMap.get(parentId);
    if (!pP) return;
    fam = createFamilyForParent(parentId, personMap);
    families.push(fam);
  }
  if (!fam.children.includes(childId)) {
    fam.children.push(childId);
  }
}

function assignChildrenToFamilies(
  families: { id: string; husb?: string; wife?: string; children: string[] }[],
  childrenRels: GedcomRelationship[],
  personMap: Map<string, GedcomPerson>
) {
  childrenRels.forEach(rel => processChildRelationship(families, rel, personMap));
}

function renderFamilies(families: { id: string; husb?: string; wife?: string; children: string[] }[]): string {
  let s = "";
  for (const fam of families) {
    s += `0 @${fam.id}@ FAM\n`;
    if (fam.husb) s += `1 HUSB @I${fam.husb.replace(/-/g, "")}@\n`;
    if (fam.wife) s += `1 WIFE @I${fam.wife.replace(/-/g, "")}@\n`;
    for (const childId of fam.children) {
      s += `1 CHIL @I${childId.replace(/-/g, "")}@\n`;
    }
  }
  return s;
}

export function buildFamilySection(
  data: { persons: GedcomPerson[]; relationships: GedcomRelationship[] },
  personMap: Map<string, GedcomPerson>
): string {
  const marriages = data.relationships.filter((r) => r.type === "marriage");
  const childrenRels = data.relationships.filter(
    (r) => r.type === "biological_child" || r.type === "adopted_child"
  );
  const families = buildInitialFamilies(marriages, personMap);
  assignChildrenToFamilies(families, childrenRels, personMap);
  return renderFamilies(families);
}

export function exportToGedcom(data: {
  persons: GedcomPerson[];
  relationships: GedcomRelationship[];
}): string {
  const personMap = new Map(data.persons.filter(p => p.id).map(p => [p.id!, p] as [string, GedcomPerson]));
  const header = buildHeader();
  const individuals = data.persons
    .filter(p => p.id)
    .map(p => buildPersonRecord(p))
    .join("");
  const families = buildFamilySection(data, personMap);
  return header + individuals + families + "0 TRLR\n";
}