import { describe, it, expect } from "vitest";
import { parseGedcom } from "@/utils/gedcom/parser";

describe("parseGedcom", () => {
  it("parses empty string", () => {
    const result = parseGedcom("");
    expect(result.persons).toEqual([]);
    expect(result.relationships).toEqual([]);
  });

  it("parses simple person record", () => {
    const gedcom = `0 @I1@ INDI
1 NAME John /Doe/
1 SEX M
1 BIRT
2 DATE 15 JAN 1980`;
    const result = parseGedcom(gedcom);
    expect(result.persons).toHaveLength(1);
    const p = result.persons[0] as any;
    expect(p.full_name).toBe("John Doe");
    expect(p.gender).toBe("male");
    expect(p.birth_year).toBe(1980);
    expect(result.relationships).toHaveLength(0);
  });

  it("parses family with marriage and children", () => {
    const gedcom = `0 @I1@ INDI
1 NAME Father /Test/
1 SEX M
1 BIRT
2 DATE 1 JAN 1970
0 @I2@ INDI
1 NAME Mother /Test/
1 SEX F
1 BIRT
2 DATE 5 FEB 1972
0 @I3@ INDI
1 NAME Child /Test/
1 SEX M
1 BIRT
2 DATE 10 MAR 2000
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@`;
    const result = parseGedcom(gedcom);
    expect(result.persons).toHaveLength(3);
    expect(result.relationships).toHaveLength(2);

    const father = result.persons.find(p => (p as any).full_name === "Father Test") as any;
    const mother = result.persons.find(p => (p as any).full_name === "Mother Test") as any;
    const child = result.persons.find(p => (p as any).full_name === "Child Test") as any;

    expect(father).toBeDefined();
    expect(mother).toBeDefined();
    expect(child).toBeDefined();

    const marriage = result.relationships.find(r => r.type === "marriage") as any;
    expect(marriage).toBeDefined();
    if (marriage) {
      expect(marriage.person_a).toBe(father.id);
      expect(marriage.person_b).toBe(mother.id);
    }

    const childRels = result.relationships.filter(r => r.type === "biological_child");
    expect(childRels).toHaveLength(1);
    const childRel = childRels[0] as any;
    expect(childRel.person_a).toBe(father.id);
    expect(childRel.person_b).toBe(child.id);
  });

  it("handles multiple families and persons", () => {
    const gedcom = `0 @I1@ INDI
1 NAME A /A/
1 SEX M
0 @I2@ INDI
1 NAME B /B/
1 SEX F
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I1@
1 CHIL @I2@`;
    const result = parseGedcom(gedcom);
    expect(result.persons).toHaveLength(2);
    expect(result.relationships.length).toBeGreaterThan(0);
  });

  it("ignores unknown tags gracefully", () => {
    const gedcom = `0 @I1@ INDI
1 NAME Test /User/
1 UNKNOWN_TAG some value
1 BIRT
2 DATE 1 JAN 2000`;
    const result = parseGedcom(gedcom);
    expect(result.persons).toHaveLength(1);
    const p = result.persons[0] as any;
    expect(p.full_name).toBe("Test User");
  });

  it("handles NOTE with CONT continuation", () => {
    const gedcom = `0 @I1@ INDI
1 NAME John /Doe/
1 NOTE This is a note
2 CONT Second line of note`;
    const result = parseGedcom(gedcom);
    const p = result.persons[0] as any;
    expect(p.note).toContain("Second line");
  });

  it("handles deceased flag", () => {
    const gedcom = `0 @I1@ INDI
1 NAME Jane /Doe/
1 DEAT Y
1 BIRT
2 DATE 1 JAN 1900`;
    const result = parseGedcom(gedcom);
    const p = result.persons[0] as any;
    expect(p.is_deceased).toBe(true);
  });
});
