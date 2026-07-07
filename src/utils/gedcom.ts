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
export interface GedcomPerson {
  id?: string;
  full_name?: string | null;
  gender?: "male" | "female" | "other" | string;
  birth_year?: number | null;
  birth_month?: number | null;
  birth_day?: number | null;
  death_year?: number | null;
  death_month?: number | null;
  death_day?: number | null;
  is_deceased?: boolean;
  is_in_law?: boolean;
  birth_order?: number | null;
  generation?: number | null;
  avatar_url?: string | null;
  note?: string | null;
}

export interface GedcomRelationship {
  type?: string;
  person_a?: string;
  person_b?: string;
}

// ============ Helpers for exportToGedcom (refactor Cycle 3) ============

function formatNum(n: number | null): string {
  return n && n > 0 ? String(n).padStart(2, "0") : "";
}

function buildHeader(): string {
  return "0 HEAD\n1 GEDC\n2 VERS 7.0\n1 SOUR Giapha_OS\n2 NAME Giapha OS\n2 VERS 0.1.0\n";
}

function formatPersonName(person: GedcomPerson): string {
  if (!person.full_name) return "1 NAME Unknown /Unknown/\n";
  const parts = person.full_name.trim().split(" ");
  const lastName = parts.length > 1 ? parts.pop()! : "";
  const firstName = parts.join(" ");
  return `1 NAME ${firstName} /${lastName}/\n`;
}
function formatPersonSex(person: GedcomPerson): string {
  if (person.gender === "male") return "1 SEX M\n";
  if (person.gender === "female") return "1 SEX F\n";
  return "1 SEX U\n";
}
function formatPersonBirth(person: GedcomPerson): string {
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
function formatPersonDeath(person: GedcomPerson): string {
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
function formatPersonNote(person: GedcomPerson): string {
  if (!person.note) return "";
  const lines = person.note.split("\n");
  let s = `1 NOTE ${lines[0]}\n`;
  for (let i = 1; i < lines.length; i++) {
    s += `2 CONT ${lines[i]}\n`;
  }
  return s;
}

function buildPersonRecord(person: GedcomPerson): string {
  if (!person.id) return "";
  let s = `0 @I${person.id.replace(/-/g, "")}@ INDI\n`;
  s += formatPersonName(person);
  s += formatPersonSex(person);
  s += formatPersonBirth(person);
  s += formatPersonDeath(person);
  s += formatPersonNote(person);
  return s;
}
// eslint-disable-next-line max-lines-per-function, max-statements
function buildFamilySection(
  data: { persons: GedcomPerson[]; relationships: GedcomRelationship[]; },
  personMap: Map<string, GedcomPerson>
): string {
  let familyCounter = 1;
  const marriages = data.relationships.filter((r) => r.type === "marriage");
  const childrenRels = data.relationships.filter(
    (r) => r.type === "biological_child" || r.type === "adopted_child",
  );

  const families: {
    id: string;
    husb?: string;
    wife?: string;
    children: string[];
  }[] = [];

  for (const marriage of marriages) {
    if (!marriage.person_a || !marriage.person_b) continue;
    const pA = personMap.get(marriage.person_a);
    const pB = personMap.get(marriage.person_b);
    if (!pA || !pB || !pA.id || !pB.id) continue;

    const fam = {
      id: `F${familyCounter++}`,
      husb: pA.gender === "male" ? pA.id : pB.gender === "male" ? pB.id : pA.id,
      wife:
        pA.gender === "female" ? pA.id : pB.gender === "female" ? pB.id : pB.id,
      children: [] as string[],
    };
    families.push(fam);
  }

  // Assign children to families
  for (const childRel of childrenRels) {
    const parentId = childRel.person_a;
    const childId = childRel.person_b;
    if (!parentId || !childId) continue;

    let fam = families.find((f) => f.husb === parentId || f.wife === parentId);

    if (!fam) {
      const pP = personMap.get(parentId);
      if (!pP) continue;
      fam = {
        id: `F${familyCounter++}`,
        husb: pP.gender === "male" ? parentId : undefined,
        wife: pP.gender === "female" ? parentId : undefined,
        children: [],
      };
      families.push(fam);
    }

    if (!fam.children.includes(childId)) {
      fam.children.push(childId);
    }
  }

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
function getMonthName(month: number | null): string {
  if (!month) return "";
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  return months[month - 1] || "";
}

function parseMonthName(name: string): number | null {
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const index = months.findIndex((m) => m === name.toUpperCase());
  return index !== -1 ? index + 1 : null;
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============ Helpers for parseGedcom (refactor Cycle 3) ============

type ParseRecord = {
  type: "INDI" | "FAM";
  id: string;
  lines: string[];
};

function splitIntoRecords(gedcom: string): ParseRecord[] {
  const lines = gedcom.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const records: ParseRecord[] = [];
  let currentRecord: ParseRecord | null = null;

  for (const line of lines) {
    if (line.startsWith("0 ")) {
      if (currentRecord) records.push(currentRecord);
      const match = line.match(/^0\s+@([^@]+)@\s+(INDI|FAM)/);
      if (match) {
        currentRecord = { id: match[1], type: match[2] as "INDI" | "FAM", lines: [] };
      } else {
        currentRecord = null;
      }
    } else if (currentRecord) {
      currentRecord.lines.push(line.trim());
    }
  }
  if (currentRecord) records.push(currentRecord);
  return records;
}

// eslint-disable-next-line max-lines-per-function, max-statements
function parsePersonRecord(record: ParseRecord, idMap: Map<string, string>): GedcomPerson {
  const uuid = generateUUID();
  idMap.set(record.id, uuid);

  let fullName = "Unknown";
  let gender: "male" | "female" | "other" = "other";
  let is_deceased = false;
  let birth_day: number | null = null;
  let birth_month: number | null = null;
  let birth_year: number | null = null;
  let death_day: number | null = null;
  let death_month: number | null = null;
  let death_year: number | null = null;
  let note = "";

  let currentTag = "";

  for (let i = 0; i < record.lines.length; i++) {
    const line = record.lines[i];
    const match = line.match(/^(\d+)\s+([A-Z0-9_]+)(?:\s+(.*))?$/);
    if (!match) continue;

    const level = parseInt(match[1]);
    const tag = match[2];
    const val = match[3] || "";

    if (level === 1) {
      currentTag = tag;
      if (tag === "NAME") {
        fullName = val.replace(/\//g, "").trim();
      } else if (tag === "SEX") {
        if (val === "M") gender = "male";
        else if (val === "F") gender = "female";
      } else if (tag === "DEAT") {
        is_deceased = val.trim().length === 0 || val === "Y";
      } else if (tag === "NOTE") {
        note = val;
      }
    } else if (level === 2) {
      if (currentTag === "NOTE" && tag === "CONT") {
        note += "\n" + val;
      } else if (currentTag === "BIRT" && tag === "DATE") {
        const cleanVal = val.replace(/^(ABT|EST|AFT|BEF|CAL)\s+/i, "");
        const parts = cleanVal.split(" ");
        if (parts.length === 3) {
          birth_day = parseInt(parts[0]) || null;
          birth_month = parseMonthName(parts[1]);
          birth_year = parseInt(parts[2]) || null;
        } else if (parts.length === 1) {
          birth_year = parseInt(parts[0]) || null;
        } else if (parts.length === 2) {
          birth_month = parseMonthName(parts[0]);
          birth_year = parseInt(parts[1]) || null;
        }
      } else if (currentTag === "DEAT" && tag === "DATE") {
        is_deceased = true;
        const cleanVal = val.replace(/^(ABT|EST|AFT|BEF|CAL)\s+/i, "");
        const parts = cleanVal.split(" ");
        if (parts.length === 3) {
          death_day = parseInt(parts[0]) || null;
          death_month = parseMonthName(parts[1]);
          death_year = parseInt(parts[2]) || null;
        } else if (parts.length === 1) {
          death_year = parseInt(parts[0]) || null;
        } else if (parts.length === 2) {
          death_month = parseMonthName(parts[0]);
          death_year = parseInt(parts[1]) || null;
        }
      }
    }
  }

  return {
    id: uuid,
    full_name: fullName,
    gender,
    is_deceased,
    birth_day: Number.isNaN(birth_day) ? null : birth_day,
    birth_month,
    birth_year: Number.isNaN(birth_year) ? null : birth_year,
    death_day: Number.isNaN(death_day) ? null : death_day,
    death_month,
    death_year: Number.isNaN(death_year) ? null : death_year,
    is_in_law: false,
    birth_order: null,
    generation: null,
    avatar_url: null,
    note: note.length > 0 ? note : null,
  };
}

function parseFamilyRecord(record: ParseRecord, idMap: Map<string, string>): { marriage?: GedcomRelationship; children: GedcomRelationship[] } {
  let husb: string | null = null;
  let wife: string | null = null;
  const children: string[] = [];

  for (const line of record.lines) {
    const match = line.match(/^1\s+(HUSB|WIFE|CHIL)\s+@([^@]+)@/);
    if (match) {
      const tag = match[1];
      const refId = match[2];
      const uuid = idMap.get(refId);
      if (!uuid) continue;

      if (tag === "HUSB") husb = uuid;
      else if (tag === "WIFE") wife = uuid;
      else if (tag === "CHIL") children.push(uuid);
    }
  }

  const marriage: GedcomRelationship | undefined = husb && wife ? { type: "marriage", person_a: husb, person_b: wife } : undefined;
  const childRels: GedcomRelationship[] = [];
  const parentA = husb || wife;
  if (parentA) {
    for (const childId of children) {
      childRels.push({ type: "biological_child", person_a: parentA, person_b: childId });
    }
  }
  return { marriage, children: childRels };
}

export function parseGedcom(gedcom: string): {
  persons: GedcomPerson[];
  relationships: GedcomRelationship[];
} {
  const records = splitIntoRecords(gedcom);
  const persons: GedcomPerson[] = [];
  const relationships: GedcomRelationship[] = [];
  const idMap = new Map<string, string>();

  for (const record of records.filter(r => r.type === "INDI")) {
    persons.push(parsePersonRecord(record, idMap));
  }

  for (const record of records.filter(r => r.type === "FAM")) {
    const { marriage, children } = parseFamilyRecord(record, idMap);
    if (marriage) relationships.push(marriage);
    relationships.push(...children);
  }

  return { persons, relationships };
}
