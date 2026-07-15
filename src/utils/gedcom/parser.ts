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

export function parseMonthName(name: string): number | null {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const index = months.findIndex((m) => m === name.toUpperCase());
  return index !== -1 ? index + 1 : null;
}

export function parseGedcomDate(dateStr: string): {
  day: number | null;
  month: number | null;
  year: number | null;
} {
  const cleanVal = dateStr.replace(/^(ABT|EST|AFT|BEF|CAL)\s+/i, "").trim();
  const parts = cleanVal.split(/\s+/);
  if (parts.length === 3) {
    return { day: parseInt(parts[0]) || null, month: parseMonthName(parts[1]), year: parseInt(parts[2]) || null };
  } else if (parts.length === 1) {
    return { day: null, month: null, year: parseInt(parts[0]) || null };
  } else if (parts.length === 2) {
    return { day: null, month: parseMonthName(parts[0]), year: parseInt(parts[1]) || null };
  }
  return { day: null, month: null, year: null };
}

function handleLevel1(tag: string, val: string, state: any): void {
  switch (tag) {
    case "NAME": state.fullName = val.replace(/\//g, "").trim(); break;
    case "SEX": state.gender = val === "M" ? "male" : val === "F" ? "female" : "other"; break;
    case "DEAT": state.is_deceased = val.trim().length === 0 || val === "Y"; break;
    case "NOTE": state.note = val; break;
  }
}

function handleLevel2(currentTag: string, tag: string, val: string, state: any): void {
  const key = `${currentTag}:${tag}`;
  if (key === "NOTE:CONT") state.note += "\n" + val;
  else if (key === "BIRT:DATE") {
    const d = parseGedcomDate(val);
    state.birth_day = d.day; state.birth_month = d.month; state.birth_year = d.year;
  } else if (key === "DEAT:DATE") {
    state.is_deceased = true;
    const d = parseGedcomDate(val);
    state.death_day = d.day; state.death_month = d.month; state.death_year = d.year;
  }
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
  const lines = gedcom.split(/\r?\n/).filter(l => l.trim());
  const records: ParseRecord[] = [];
  let cur: ParseRecord | null = null;

  for (const line of lines) {
    if (line.startsWith("0 ")) {
      if (cur) records.push(cur);
      const m = line.match(/^0\s+@([^@]+)@\s+(INDI|FAM)/);
      cur = m ? { id: m[1], type: m[2] as "INDI" | "FAM", lines: [] } : null;
    } else if (cur) {
      cur.lines.push(line.trim());
    }
  }
  if (cur) records.push(cur);
  return records;
}



function buildGedcomPersonFromState(state: any, uuid: string): GedcomPerson {
  return {
    id: uuid,
    full_name: state.fullName,
    gender: state.gender,
    is_deceased: state.is_deceased,
    birth_day: Number.isNaN(state.birth_day) ? null : state.birth_day,
    birth_month: state.birth_month,
    birth_year: Number.isNaN(state.birth_year) ? null : state.birth_year,
    death_day: Number.isNaN(state.death_day) ? null : state.death_day,
    death_month: state.death_month,
    death_year: Number.isNaN(state.death_year) ? null : state.death_year,
    is_in_law: false,
    birth_order: null,
    generation: null,
    avatar_url: null,
    note: state.note.length > 0 ? state.note : null,
  };
}

function processPersonLine(line: string, currentTag: string, state: any): string {
  const match = line.match(/^(\d+)\s+([A-Z0-9_]+)(?:\s+(.*))?$/);
  if (!match) return currentTag;
  const level = parseInt(match[1]);
  const tag = match[2];
  const val = match[3] || "";
  if (level === 1) {
    handleLevel1(tag, val, state);
    return tag;
  } else if (level === 2) {
    handleLevel2(currentTag, tag, val, state);
  }
  return currentTag;
}

function parsePersonState(lines: string[]): any {
  const state: any = {
    fullName: "Unknown",
    gender: "other",
    is_deceased: false,
    birth_day: null, birth_month: null, birth_year: null,
    death_day: null, death_month: null, death_year: null,
    note: ""
  };
  let currentTag = "";
  for (const line of lines) {
    currentTag = processPersonLine(line, currentTag, state);
  }
  return state;
}

function parsePersonRecord(record: ParseRecord, idMap: Map<string, string>): GedcomPerson {
  const uuid = generateUUID();
  idMap.set(record.id, uuid);
  const state = parsePersonState(record.lines);
  return buildGedcomPersonFromState(state, uuid);
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

export function parseGedcom(gedcom: string): { persons: GedcomPerson[]; relationships: GedcomRelationship[] } {
  const records = splitIntoRecords(gedcom);
  const persons: GedcomPerson[] = [];
  const relationships: GedcomRelationship[] = [];
  const idMap = new Map<string, string>();

  for (const r of records) {
    if (r.type === "INDI") persons.push(parsePersonRecord(r, idMap));
    else if (r.type === "FAM") {
      const { marriage, children } = parseFamilyRecord(r, idMap);
      if (marriage) relationships.push(marriage);
      relationships.push(...children);
    }
  }
  return { persons, relationships };
}
