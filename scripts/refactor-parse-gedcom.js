const fs = require('fs');
const path = 'src/utils/gedcom.ts';

const content = fs.readFileSync(path, 'utf8');
const startMarker = 'export function parseGedcom(';
const startIdx = content.indexOf(startMarker);
if (startIdx === -1) {
  console.error('Could not find parseGedcom');
  process.exit(1);
}

const before = content.slice(0, startIdx);

const newBlock = `// ============ Helpers for parseGedcom (refactor Cycle 3) ============

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
    const match = line.match(/^(\d+)\s+([A-Z0-9_]+)(?:\s+(.*))?$);
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
        const cleanVal = val.replace(/^(ABT|EST|AFT|BEF|CAL)\\s+/i, "");
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
        const cleanVal = val.replace(/^(ABT|EST|AFT|BEF|CAL)\\s+/i, "");
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
    const match = line.match(/^1\\s+(HUSB|WIFE|CHIL)\\s+@([^@]+)@/);
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
`;

fs.writeFileSync(path, before + newBlock);
console.log('Refactored parseGedcom with helpers.');