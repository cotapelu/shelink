const fs = require('fs');
const path = 'src/utils/gedcom.ts';
const content = fs.readFileSync(path, 'utf8');

const startMarker = 'export function exportToGedcom(';
const startIdx = content.indexOf(startMarker);
if (startIdx === -1) {
  console.error('Could not find exportToGedcom');
  process.exit(1);
}

// Find end: the line before 'function getMonthName'
const endMarker = 'function getMonthName(';
const endIdx = content.indexOf(endMarker, startIdx);
if (endIdx === -1) {
  console.error('Could not find getMonthName after exportToGedcom');
  process.exit(1);
}

const before = content.slice(0, startIdx);
const after = content.slice(endIdx); // includes the getMonthName function and everything after

const newBlock = `// ============ Helpers for exportToGedcom (refactor Cycle 3) ============

function formatNum(n: number | null): string {
  return n && n > 0 ? String(n).padStart(2, "0") : "";
}

function buildHeader(): string {
  return "0 HEAD\\n1 GEDC\\n2 VERS 7.0\\n1 SOUR Giapha_OS\\n2 NAME Giapha OS\\n2 VERS 0.1.0\\n";
}

function buildPersonRecord(person: GedcomPerson): string {
  if (!person.id) return "";
  let s = \`0 @I\${person.id.replace(/-/g, "")}@ INDI\\n\`;

  // Name
  if (person.full_name) {
    const parts = person.full_name.trim().split(" ");
    const lastName = parts.length > 1 ? parts.pop()! : "";
    const firstName = parts.join(" ");
    s += \`1 NAME \${firstName} /${lastName}/\\n\`;
  } else {
    s += "1 NAME Unknown /Unknown/\\n";
  }

  // Sex
  if (person.gender === "male") s += "1 SEX M\\n";
  else if (person.gender === "female") s += "1 SEX F\\n";
  else s += "1 SEX U\\n";

  // Birth
  if (person.birth_year || person.birth_month || person.birth_day) {
    s += "1 BIRT\\n";
    const day = formatNum(person.birth_day ?? null);
    const mont = getMonthName(person.birth_month ?? null);
    const yea = person.birth_year ? String(person.birth_year) : "";
    const dateParts = [day, mont, yea].filter(Boolean);
    if (dateParts.length > 0) {
      s += \`2 DATE \${dateParts.join(" ")}\\n\`;
    }
  }

  // Death
  if (person.is_deceased) {
    s += "1 DEAT Y\\n";
    if (person.death_year || person.death_month || person.death_day) {
      const day = formatNum(person.death_day ?? null);
      const mont = getMonthName(person.death_month ?? null);
      const yea = person.death_year ? String(person.death_year) : "";
      const dateParts = [day, mont, yea].filter(Boolean);
      if (dateParts.length > 0) {
        s += \`2 DATE \${dateParts.join(" ")}\\n\`;
      }
    }
  }

  // Note
  if (person.note) {
    const lines = person.note.split("\\n");
    s += \`1 NOTE \${lines[0]}\\n\`;
    for (let i = 1; i < lines.length; i++) {
      s += \`2 CONT \${lines[i]}\\n\`;
    }
  }

  return s;
}

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
    const pA = personMap.get(marriage.person_a!);
    const pB = personMap.get(marriage.person_b!);
    if (!pA || !pB || !pA.id || !pB.id) continue;

    const fam = {
      id: \`F\${familyCounter++}\`,
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
        id: \`F\${familyCounter++}\`,
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
    s += \`0 @\${fam.id}@ FAM\\n\`;
    if (fam.husb) s += \`1 HUSB @I\${fam.husb.replace(/-/g, "")}@\\n\`;
    if (fam.wife) s += \`1 WIFE @I\${fam.wife.replace(/-/g, "")}@\\n\`;
    for (const childId of fam.children) {
      s += \`1 CHIL @I\${childId.replace(/-/g, "")}@\\n\`;
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
  return header + individuals + families + "0 TRLR\\n";
}
`;

fs.writeFileSync(path, before + newBlock + after);
console.log('Refactored exportToGedcom successfully.');
