import { checklistForCategory, evaluateChecklist, ArchiveChecklist } from "@/lib/archive/checklists";
import type { MatterCategory } from "@prisma/client";

describe("archive/checklists", () => {
  describe("checklistForCategory", () => {
    it("should return LITIGATION checklist for CIVIL_COMMERCIAL", () => {
      const result = checklistForCategory("CIVIL_COMMERCIAL" as MatterCategory);
      expect(result.kind).toBe("LITIGATION");
      expect(result.items.length).toBeGreaterThan(0);
    });

    it("should return LITIGATION for CRIMINAL", () => {
      const result = checklistForCategory("CRIMINAL" as MatterCategory);
      expect(result.kind).toBe("LITIGATION");
    });

    it("should return NON_LITIGATION for NON_LITIGATION", () => {
      const result = checklistForCategory("NON_LITIGATION" as MatterCategory);
      expect(result.kind).toBe("NON_LITIGATION");
      expect(result.items.some(i => i.id === "legal_opinion")).toBe(true);
    });

    it("should return LEGAL_COUNSEL for LEGAL_COUNSEL", () => {
      const result = checklistForCategory("LEGAL_COUNSEL" as MatterCategory);
      expect(result.kind).toBe("LEGAL_COUNSEL");
    });

    // For unknown categories, the function defaults to LITIGATION
    it("should default to LITIGATION for unmapped category", () => {
      // @ts-expect-error - testing unknown category
      const result = checklistForCategory("UNKNOWN" as MatterCategory);
      expect(result.kind).toBe("LITIGATION");
    });
  });

  describe("evaluateChecklist", () => {
    const sampleChecklist: ArchiveChecklist = {
      kind: "LITIGATION",
      title: "Test",
      items: [
        { id: "a", label: "A", required: true },
        { id: "b", label: "B", required: true },
        { id: "c", label: "C", required: false },
      ],
    };

    it("should return no missingRequired when all required selected", () => {
      const checked = { a: true, b: true, c: true };
      const result = evaluateChecklist(sampleChecklist, checked);
      expect(result.missingRequired).toHaveLength(0);
    });

    it("should identify missing required items", () => {
      const checked = { a: true }; // b missing
      const result = evaluateChecklist(sampleChecklist, checked);
      expect(result.missingRequired).toHaveLength(1);
      expect(result.missingRequired[0].id).toBe("b");
    });

    it("should identify missing optional items when not checked", () => {
      // c is optional and not checked
      const checked = { a: true, b: true };
      const result = evaluateChecklist(sampleChecklist, checked);
      expect(result.missingOptional).toHaveLength(1);
      expect(result.missingOptional[0].id).toBe("c");
    });

    it("should ignore extra ids not in checklist", () => {
      const checked = { a: true, b: true, x: true }; // x not in checklist
      const result = evaluateChecklist(sampleChecklist, checked);
      expect(result.missingRequired).toHaveLength(0);
      expect(result.missingOptional).toHaveLength(1); // still missing c
    });
  });
});
