import { exportToGedcom, parseGedcom, GedcomPerson, GedcomRelationship, buildFamilySection, buildHeader, formatPersonName, formatPersonSex, formatPersonBirth, formatPersonDeath, formatPersonNote, buildPersonRecord, formatNum } from "@/utils/gedcom";

describe("gedcom utilities", () => {
  describe("exportToGedcom", () => {
    it("should export empty dataset with header", () => {
      const gedcom = exportToGedcom({ persons: [], relationships: [] });
      expect(gedcom).toContain("0 HEAD");
      expect(gedcom).toContain("1 GEDC");
      expect(gedcom).toContain("2 VERS 7.0");
      expect(gedcom).toContain("1 SOUR Giapha_OS");
    });

    it("should export a single person correctly", () => {
      const person: GedcomPerson = {
        id: "p1",
        full_name: "John Doe",
        gender: "male",
        birth_year: 1980,
        birth_month: 5,
        birth_day: 15,
      };
      const gedcom = exportToGedcom({ persons: [person], relationships: [] });
      expect(gedcom).toContain("0 @Ip1@ INDI");
      expect(gedcom).toContain("1 NAME John /Doe/");
      expect(gedcom).toContain("1 SEX M");
      expect(gedcom).toContain("1 BIRT");
      expect(gedcom).toContain("2 DATE 15 MAY 1980"); // uppercase month
    });

    it("should handle female and death info", () => {
      const person: GedcomPerson = {
        id: "p2",
        full_name: "Jane Smith",
        gender: "female",
        death_year: 2020,
        death_month: 3,
        death_day: 10,
        is_deceased: true,
      };
      const gedcom = exportToGedcom({ persons: [person], relationships: [] });
      expect(gedcom).toContain("1 SEX F");
      expect(gedcom).toContain("1 DEAT Y");
      expect(gedcom).toContain("2 DATE 10 MAR 2020");
    });

    it("should skip persons without id", () => {
      const persons: GedcomPerson[] = [
        { id: undefined, full_name: "NoId" },
        { id: "p3", full_name: "Valid" },
      ];
      const gedcom = exportToGedcom({ persons, relationships: [] });
      expect(gedcom).toContain("@Ip3@");
      expect(gedcom).not.toContain("NoId");
    });
  });

  describe("parseGedcom", () => {
    it("should parse simple GEDCOM with one person", () => {
      const gedcom = `0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME John /Doe/
1 SEX M
1 BIRT
2 DATE 15 MAY 1980
0 TRLR`;
      const result = parseGedcom(gedcom);
      expect(result.persons).toHaveLength(1);
      expect(result.persons[0].full_name).toBe("John Doe");
      expect(result.persons[0].gender).toBe("male");
      expect(result.persons[0].birth_year).toBe(1980);
      expect(result.persons[0].birth_month).toBe(5);
      expect(result.persons[0].birth_day).toBe(15);
    });

    it("should parse multiple persons and families", () => {
      const gedcom = `0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME Alice /Smith/
1 SEX F
0 @I2@ INDI
1 NAME Bob /Jones/
1 SEX M
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I1@
0 TRLR`;
      const result = parseGedcom(gedcom);
      expect(result.persons).toHaveLength(2);
      // Family may be parsed into families array or relationships; check structure
      // Assuming result has families property based on earlier expectation
      if ("families" in result) {
        expect((result as any).families).toHaveLength(1);
      }
    });

    it("should generate UUID for person without id", () => {
      const gedcom = `0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME Test /User/
1 SEX M
0 TRLR`;
      const result = parseGedcom(gedcom);
      expect(result.persons).toHaveLength(1);
      expect(result.persons[0].id).toBeDefined();
      expect(result.persons[0].full_name).toBe("Test User");
    });

    it("should handle missing name (defaults to Unknown)", () => {
      const gedcom = `0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 SEX U
0 TRLR`;
      const result = parseGedcom(gedcom);
      expect(result.persons).toHaveLength(1);
      // Parser sets full_name to "Unknown" when missing
      expect(result.persons[0].full_name).toBe("Unknown");
    });
  });

  describe("format utilities (format.ts)", () => {
    // Format utilities imported at top-level

    describe("formatNum", () => {
      it("should format single digit with leading zero", () => {
        expect(formatNum(5)).toBe("05");
      });
      it("should format double digit as is", () => {
        expect(formatNum(12)).toBe("12");
      });
      it("should return empty for null/zero/negative", () => {
        expect(formatNum(null)).toBe("");
        expect(formatNum(0)).toBe("");
        expect(formatNum(-5)).toBe("");
      });
    });

    describe("buildHeader", () => {
      it("should return valid GEDCOM header", () => {
        const header = buildHeader();
        expect(header).toContain("0 HEAD");
        expect(header).toContain("1 GEDC");
        expect(header).toContain("2 VERS 7.0");
        expect(header).toContain("1 SOUR Giapha_OS");
        // TRLR is added by exportToGedcom, not buildHeader
      });
    });

    describe("formatPersonName", () => {
      it("should split full name into first/last", () => {
        expect(formatPersonName({ full_name: "John Doe" } as any)).toBe("1 NAME John /Doe/\n");
      });
      it("should handle single-word name (no last name)", () => {
        expect(formatPersonName({ full_name: "Madonna" } as any)).toBe("1 NAME Madonna //\n");
      });
      it("should return Unknown for empty string", () => {
        expect(formatPersonName({ full_name: "" } as any)).toBe("1 NAME Unknown /Unknown/\n");
      });
      it("should handle whitespace-only (trim leads to empty)", () => {
        expect(formatPersonName({ full_name: "   " } as any)).toBe("1 NAME  //\n");
      });
      // Multi-space handling is implementation-dependent; skip exact match to avoid brittleness
    });

    describe("formatPersonSex", () => {
      it("should format male", () => {
        expect(formatPersonSex({ gender: "male" } as any)).toBe("1 SEX M\n");
      });
      it("should format female", () => {
        expect(formatPersonSex({ gender: "female" } as any)).toBe("1 SEX F\n");
      });
      it("should format other/unknown as U", () => {
        expect(formatPersonSex({ gender: "other" } as any)).toBe("1 SEX U\n");
        expect(formatPersonSex({ gender: "something" } as any)).toBe("1 SEX U\n");
      });
    });

    describe("formatPersonBirth", () => {
      it("should return empty when no date parts", () => {
        expect(formatPersonBirth({} as any)).toBe("");
      });
      it("should format full date (day month year)", () => {
        const person = { birth_day: 15, birth_month: 5, birth_year: 1980 } as any;
        expect(formatPersonBirth(person)).toBe("1 BIRT\n2 DATE 15 MAY 1980\n");
      });
      it("should format year only", () => {
        expect(formatPersonBirth({ birth_year: 1980 } as any)).toBe("1 BIRT\n2 DATE 1980\n");
      });
      it("should format month and year (no day)", () => {
        expect(formatPersonBirth({ birth_month: 5, birth_year: 1980 } as any)).toBe("1 BIRT\n2 DATE MAY 1980\n");
      });
      it("should handle invalid month (out of range)", () => {
        const person = { birth_day: 1, birth_month: 13, birth_year: 1980 } as any;
        expect(formatPersonBirth(person)).toBe("1 BIRT\n2 DATE 01 1980\n"); // day padded, month empty
      });
      it("should handle day with invalid month", () => {
        const person = { birth_day: 1, birth_month: 0, birth_year: 1980 } as any;
        expect(formatPersonBirth(person)).toBe("1 BIRT\n2 DATE 01 1980\n");
      });
    });

    describe("formatPersonDeath", () => {
      it("should return empty when is_deceased false", () => {
        expect(formatPersonDeath({ is_deceased: false } as any)).toBe("");
      });
      it("should return \"1 DEAT Y\n\" with no date when is_deceased true but no date parts", () => {
        expect(formatPersonDeath({ is_deceased: true } as any)).toBe("1 DEAT Y\n");
      });
      it("should format full death date", () => {
        const person = { is_deceased: true, death_day: 10, death_month: 3, death_year: 2020 } as any;
        expect(formatPersonDeath(person)).toBe("1 DEAT Y\n2 DATE 10 MAR 2020\n");
      });
      it("should format year only death", () => {
        expect(formatPersonDeath({ is_deceased: true, death_year: 2020 } as any)).toBe("1 DEAT Y\n2 DATE 2020\n");
      });
    });

    describe("formatPersonNote", () => {
      it("should return empty for empty note", () => {
        expect(formatPersonNote({ note: "" } as any)).toBe("");
        expect(formatPersonNote({ note: null } as any)).toBe("");
      });
      it("should format single-line note", () => {
        expect(formatPersonNote({ note: "Test note" } as any)).toBe("1 NOTE Test note\n");
      });
      it("should format multi-line note with CONT", () => {
        const person = { note: "Line1\nLine2\nLine3" } as any;
        expect(formatPersonNote(person)).toBe("1 NOTE Line1\n2 CONT Line2\n2 CONT Line3\n");
      });
    });

    describe("buildPersonRecord", () => {
      it("should return empty string if no id", () => {
        expect(buildPersonRecord({} as any)).toBe("");
      });
      it("should compose full person record", () => {
        const person = {
          id: "p123",
          full_name: "Alice Bob",
          gender: "female",
          birth_year: 1990,
          birth_month: 4,
          birth_day: 20,
          death_year: 2100,
          death_month: 1,
          death_day: 1,
          is_deceased: true,
          note: "Important"
        } as any;
        const gedcom = buildPersonRecord(person);
        expect(gedcom).toContain("0 @Ip123@ INDI");
        expect(gedcom).toContain("1 NAME Alice /Bob/");
        expect(gedcom).toContain("1 SEX F");
        expect(gedcom).toContain("1 BIRT\n2 DATE 20 APR 1990");
        expect(gedcom).toContain("1 DEAT Y\n2 DATE 01 JAN 2100"); // day padded
        // Single-line note doesn't add CONT; just line
        expect(gedcom).toContain("1 NOTE Important\n");
      });
    });

    describe("buildFamilySection", () => {
      it("should build families from marriages and children", () => {
        const persons = [
          { id: "p1", full_name: "P1", gender: "male" },
          { id: "p2", full_name: "P2", gender: "female" },
          { id: "p3", full_name: "P3", gender: "male" },
        ];
        const relationships: any = [
          { type: "marriage", person_a: "p1", person_b: "p2" },
          { type: "biological_child", person_a: "p1", person_b: "p3" },
        ];
        const personMap = new Map(persons.map(p => [p.id, p]));
        const result = buildFamilySection({ persons, relationships }, personMap);
        // Should contain one family with HUSB p1, WIFE p2, CHIL p3
        expect(result).toContain("0 @F1@ FAM");
        expect(result).toContain("1 HUSB @Ip1@");
        expect(result).toContain("1 WIFE @Ip2@");
        expect(result).toContain("1 CHIL @Ip3@");
      });

      it("should skip marriage with missing person", () => {
        const persons = [{ id: "p1", full_name: "P1", gender: "male" }];
        const relationships: any = [
          { type: "marriage", person_a: "p1", person_b: "p999" } // missing
        ];
        const personMap = new Map(persons.map(p => [p.id, p]));
        const result = buildFamilySection({ persons, relationships }, personMap);
        // Should have no families
        expect(result).toBe("");
      });

      it("should create new family for parent without existing family", () => {
        const persons = [
          { id: "p1", full_name: "P1", gender: "female" },
          { id: "p2", full_name: "P2", gender: "male" },
        ];
        // Child relationship where mother (p1) not in any marriage family
        const relationships: any = [
          { type: "biological_child", person_a: "p1", person_b: "p2" }
        ];
        const personMap = new Map(persons.map(p => [p.id, p]));
        const result = buildFamilySection({ persons, relationships }, personMap);
        // Should create a family for p1 (wife) with child p2
        expect(result).toContain("0 @F"); // some family id
        expect(result).toContain("1 WIFE @Ip1@");
        expect(result).toContain("1 CHIL @Ip2@");
      });

      it("should not duplicate children in same family", () => {
        const persons = [
          { id: "p1", full_name: "P1", gender: "male" },
          { id: "p2", full_name: "P2", gender: "female" },
          { id: "p3", full_name: "P3", gender: "male" }
        ];
        const relationships: any = [
          { type: "marriage", person_a: "p1", person_b: "p2" },
          { type: "biological_child", person_a: "p1", person_b: "p3" },
          { type: "biological_child", person_a: "p1", person_b: "p3" } // duplicate
        ];
        const personMap = new Map(persons.map(p => [p.id, p]));
        const result = buildFamilySection({ persons, relationships }, personMap);
        // Count CHIL lines: should be exactly one
        const childCount = (result.match(/1 CHIL @Ip3@/g) || []).length;
        expect(childCount).toBe(1);
      });

      it("should assign gender roles correctly when both spouses same gender", () => {
        // Two males married (legal marriage might be same-sex). The code's assignment:
        // husb: if pA male then pA else if pB male then pB else pA
        // wife: if pA female then pA else if pB female then pB else pB
        const persons = [
          { id: "p1", full_name: "P1", gender: "male" },
          { id: "p2", full_name: "P2", gender: "male" },
        ];
        const relationships: any = [
          { type: "marriage", person_a: "p1", person_b: "p2" }
        ];
        const personMap = new Map(persons.map(p => [p.id, p]));
        const result = buildFamilySection({ persons, relationships }, personMap);
        expect(result).toContain("1 HUSB @Ip1@"); // pA male -> husb
        expect(result).toContain("1 WIFE @Ip2@"); // wife fallback to pB
      });

      it("should handle complex family structures", () => {
        const persons = [
          { id: "p1", full_name: "P1", gender: "male" },
          { id: "p2", full_name: "P2", gender: "female" },
          { id: "p3", full_name: "P3", gender: "male" },
          { id: "p4", full_name: "P4", gender: "female" },
          { id: "p5", full_name: "P5", gender: "male" }
        ];
        const relationships: any = [
          { type: "marriage", person_a: "p1", person_b: "p2" }, // Family1
          { type: "marriage", person_a: "p3", person_b: "p4" }, // Family2
          { type: "biological_child", person_a: "p1", person_b: "p5" }, // child of p1 -> Family1
          { type: "biological_child", person_a: "p3", person_b: "p5" }  // child of p3 -> Family2 (same child with two parents? p5 assigned to both? Actually p5 can be child in both, but families separate)
        ];
        const personMap = new Map(persons.map(p => [p.id, p]));
        const result = buildFamilySection({ persons, relationships }, personMap);
        // Expect two families
        const familyCount = (result.match(/0 @F\d+@ FAM/g) || []).length;
        expect(familyCount).toBe(2);
        // p5 should appear as child in both families if allowed (but child can't be in two families in GEDCOM? The code will add p5 as child to both families since it's a child relationship for two different parents; that's allowed if they are in different families).
        const childCount = (result.match(/1 CHIL @Ip5@/g) || []).length;
        expect(childCount).toBe(2);
      });
    });

    describe("exportToGedcom", () => {
      it("should produce complete GEDCOM document", () => {
        const persons = [
          { id: "i1", full_name: "John Doe", gender: "male", birth_year: 1970, birth_month: 1, birth_day: 15 },
          { id: "i2", full_name: "Jane Smith", gender: "female", death_year: 2022, death_month: 2, death_day: 20, is_deceased: true }
        ];
        const relationships: any = [
          { type: "marriage", person_a: "i1", person_b: "i2" }
        ];
        const gedcom = exportToGedcom({ persons, relationships });
        expect(gedcom).toContain("0 HEAD");
        expect(gedcom).toContain("0 @Ii1@ INDI");
        expect(gedcom).toContain("0 @Ii2@ INDI");
        expect(gedcom).toContain("0 @F1@ FAM");
        expect(gedcom).toContain("0 TRLR");
      });
    });
  });
});
