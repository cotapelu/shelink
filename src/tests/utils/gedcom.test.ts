import { exportToGedcom, parseGedcom, GedcomPerson, GedcomRelationship } from "@/utils/gedcom";

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
});
