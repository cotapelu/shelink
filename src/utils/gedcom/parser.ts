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

function parseMonthName(name: string): number | null {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const index = months.findIndex((m) => m === name.toUpperCase());
  return index !== -1 ? index + 1 : null;
}

function parseGedcomDate(dateStr: string): {
  day: number | null;
  month: number | null;
  year: number | null;
} {
  const cleanVal = dateStr.replace(/^(ABT|EST|AFT|BEF|CAL)\s+/i, "");
  const parts = cleanVal.split(" ");
  if (parts.length === 3) {
    return {
      day: parseInt(parts[0]) || null,
      month: parseMonthName(parts[1]),
      year: parseInt(parts[2]) || null,
    };
  } else if (parts.length === 1) {
    return { day: null, month: null, year: parseInt(parts[0]) || null };
  } else if (parts.length === 2) {
    return { day: null, month: parseMonthName(parts[0]), year: parseInt(parts[1]) || null };
  }
  return { day: null, month: null, year: null };
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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

  const level1Handlers: Record<string, (val: string) => void> = {
    NAME: (val) => { fullName = val.replace(/\//g, "").trim(); },
    SEX: (val) => {
      if (val === "M") gender = "male";
      else if (val === "F") gender = "female";
    },
    DEAT: (val) => { is_deceased = val.trim().length === 0 || val === "Y"; },
    NOTE: (val) => { note = val; },
  };

  const level2Handlers: Record<string, (val: string) => void> = {
    "NOTE:CONT": (val) => { note += "\n" + val; },
    "BIRT:DATE": (val) => {
      const date = parseGedcomDate(val);
      birth_day = date.day;
      birth_month = date.month;
      birth_year = date.year;
    },
    "DEAT:DATE": (val) => {
      is_deceased = true;
      const date = parseGedcomDate(val);
      death_day = date.day;
      death_month = date.month;
      death_year = date.year;
    },
  };

  for (let i = 0; i < record.lines.length; i++) {
    const line = record.lines[i];
    const match = line.match(/^(\d+)\s+([A-Z0-9_]+)(?:\s+(.*))?$/);
    if (!match) continue;

    const level = parseInt(match[1]);
    const tag = match[2];
    const val = match[3] || "";

    if (level === 1) {
      currentTag = tag;
      const h1 = level1Handlers[tag];
      if (h1) h1(val);
    } else if (level === 2) {
      const key = `${currentTag}:${tag}`;
      const h2 = level2Handlers[key];
      if (h2) h2(val);
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

function parseFamilyReferences(lines: string[], idMap: Map<string, string>): { husb: string | null; wife: string | null; children: string[] } {
  let husb: string | null = null;
  let wife: string | null = null;
  const children: string[] = [];

  for (const line of lines) {
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
  return { husb, wife, children };
}

function createMarriage(husb: string, wife: string): GedcomRelationship {
  return { type: "marriage", person_a: husb, person_b: wife };
}

function createChildRelationships(parentA: string | null, children: string[]): GedcomRelationship[] {
  if (!parentA) return [];
  return children.map((childId) => ({ type: "biological_child", person_a: parentA, person_b: childId }));
}

function parseFamilyRecord(record: ParseRecord, idMap: Map<string, string>): { marriage?: GedcomRelationship; children: GedcomRelationship[] } {
  const { husb, wife, children } = parseFamilyReferences(record.lines, idMap);
  const marriage: GedcomRelationship | undefined = husb && wife ? createMarriage(husb, wife) : undefined;
  return { marriage, children: createChildRelationships(husb || wife, children) };
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
