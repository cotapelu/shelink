import { describe, it, expect } from "vitest";
import { suggestHandlingAgency, proceduresByCategory, standingsByCategory, matterCategoryCode } from "@/lib/procedures-by-category";

describe("procedures-by-category", () => {
  describe("suggestHandlingAgency", () => {
    it("returns correct agency for investigation", () => {
      expect(suggestHandlingAgency("INVESTIGATION")).toBe("Công an / Thanh tra / An ninh");
    });

    it("returns correct agency for prosecution review", () => {
      expect(suggestHandlingAgency("PROSECUTION_REVIEW")).toBe("Viện kiểm sát (phòng xét xử)");
    });

    it("returns correct agency for prosecutorial supervision", () => {
      expect(suggestHandlingAgency("PROSECUTORIAL_SUPERVISION")).toBe("Viện kiểm sát");
    });

    it("returns correct agency for criminal enforcement", () => {
      expect(suggestHandlingAgency("CRIMINAL_ENFORCEMENT")).toBe("Nhà tù / Trại giam / Cơ quan cộng đồng");
    });

    it("returns correct agency for commutation parole review", () => {
      expect(suggestHandlingAgency("COMMUTATION_PAROLE_REVIEW")).toBe("Tòa án (phòng thi hành)");
    });

    it("returns correct agency for admin reconsideration", () => {
      expect(suggestHandlingAgency("ADMIN_RECONSIDERATION")).toBe("Cơ quan phúc thẩm hành chính");
    });

    it("returns correct agency for commercial arbitration", () => {
      expect(suggestHandlingAgency("COMMERCIAL_ARBITRATION")).toBe("Hội đồng trọng tài thương mại");
    });

    it("returns correct agency for labor arbitration", () => {
      expect(suggestHandlingAgency("LABOR_ARBITRATION")).toBe("Hội đồng trọng tài lao động");
    });

    it("returns correct agency for arbitration set aside/enforcement review", () => {
      expect(suggestHandlingAgency("ARBITRATION_SET_ASIDE")).toBe("Tòa án trung cấp");
      expect(suggestHandlingAgency("ARBITRATION_ENFORCEMENT_REVIEW")).toBe("Tòa án trung cấp");
    });

    it("returns correct agency for enforcement and objection", () => {
      expect(suggestHandlingAgency("ENFORCEMENT")).toBe("Tòa án (phòng thi hành)");
      expect(suggestHandlingAgency("ENFORCEMENT_OBJECTION")).toBe("Tòa án (phòng thi hành)");
    });

    it("returns correct agency for admin non-litigation enforcement", () => {
      expect(suggestHandlingAgency("ADMIN_NON_LITIGATION_ENFORCEMENT")).toBe("Tòa án");
    });

    it("returns correct agency for litigation procedures (default)", () => {
      expect(suggestHandlingAgency("FIRST_INSTANCE")).toBe("Tòa án");
      expect(suggestHandlingAgency("SECOND_INSTANCE")).toBe("Tòa án");
      expect(suggestHandlingAgency("RETRIAL_REVIEW")).toBe("Tòa án");
      expect(suggestHandlingAgency("RETRIAL")).toBe("Tòa án");
      expect(suggestHandlingAgency("REMAND_FIRST")).toBe("Tòa án");
      expect(suggestHandlingAgency("REMAND_SECOND")).toBe("Tòa án");
    });

    it("returns correct agency for CUSTOM", () => {
      expect(suggestHandlingAgency("CUSTOM")).toBe("Tòa án");
    });

    it("returns correct agency for NON_LITIGATION_PHASE", () => {
      expect(suggestHandlingAgency("NON_LITIGATION_PHASE")).toBe("Tòa án");
    });
  });

  describe("proceduresByCategory", () => {
    it("has correct procedure types for CIVIL_COMMERCIAL", () => {
      const expected = [
        "FIRST_INSTANCE", "SECOND_INSTANCE", "RETRIAL_REVIEW", "RETRIAL",
        "REMAND_FIRST", "REMAND_SECOND", "COMMERCIAL_ARBITRATION",
        "LABOR_ARBITRATION", "ARBITRATION_SET_ASIDE", "ARBITRATION_ENFORCEMENT_REVIEW",
        "ENFORCEMENT", "ENFORCEMENT_OBJECTION", "PROSECUTORIAL_SUPERVISION", "CUSTOM"
      ];
      expect(proceduresByCategory.CIVIL_COMMERCIAL).toEqual(expected);
    });

    it("has correct procedure types for CRIMINAL", () => {
      const expected = [
        "INVESTIGATION", "PROSECUTION_REVIEW", "FIRST_INSTANCE", "SECOND_INSTANCE",
        "DEATH_PENALTY_REVIEW", "RETRIAL_REVIEW", "RETRIAL", "CRIMINAL_ENFORCEMENT",
        "COMMUTATION_PAROLE_REVIEW", "PROSECUTORIAL_SUPERVISION", "CUSTOM"
      ];
      expect(proceduresByCategory.CRIMINAL).toEqual(expected);
    });

    it("has correct procedure types for ADMINISTRATIVE", () => {
      const expected = [
        "ADMIN_RECONSIDERATION", "FIRST_INSTANCE", "SECOND_INSTANCE",
        "RETRIAL_REVIEW", "RETRIAL", "ADMIN_NON_LITIGATION_ENFORCEMENT",
        "PROSECUTORIAL_SUPERVISION", "CUSTOM"
      ];
      expect(proceduresByCategory.ADMINISTRATIVE).toEqual(expected);
    });

    it("has correct procedure types for LABOR_ARBITRATION", () => {
      const expected = ["LABOR_ARBITRATION", "FIRST_INSTANCE", "SECOND_INSTANCE", "RETRIAL_REVIEW", "RETRIAL", "ENFORCEMENT", "CUSTOM"];
      expect(proceduresByCategory.LABOR_ARBITRATION).toEqual(expected);
    });

    it("has correct procedure types for COMMERCIAL_ARBITRATION", () => {
      expect(proceduresByCategory.COMMERCIAL_ARBITRATION).toEqual(["COMMERCIAL_ARBITRATION"]);
    });

    it("has correct procedure types for NON_LITIGATION", () => {
      expect(proceduresByCategory.NON_LITIGATION).toEqual(["NON_LITIGATION_PHASE", "CUSTOM"]);
    });

    it("has correct procedure types for LEGAL_COUNSEL", () => {
      expect(proceduresByCategory.LEGAL_COUNSEL).toEqual(["NON_LITIGATION_PHASE", "CUSTOM"]);
    });

    it("has correct procedure types for SPECIAL_PROJECT", () => {
      expect(proceduresByCategory.SPECIAL_PROJECT).toEqual(["NON_LITIGATION_PHASE", "CUSTOM"]);
    });
  });

  describe("standingsByCategory", () => {
    it("has correct standings for CIVIL_COMMERCIAL", () => {
      const expected = ["PLAINTIFF", "DEFENDANT", "THIRD_PARTY", "ARBITRATION_CLAIMANT", "ARBITRATION_RESPONDENT"];
      expect(standingsByCategory.CIVIL_COMMERCIAL).toEqual(expected);
    });

    it("has correct standings for CRIMINAL", () => {
      const expected = ["CRIMINAL_DEFENDANT", "CRIMINAL_VICTIM", "PRIVATE_PROSECUTOR", "CRIMINAL_INCIDENTAL_PLAINTIFF"];
      expect(standingsByCategory.CRIMINAL).toEqual(expected);
    });

    it("has correct standings for ADMINISTRATIVE", () => {
      expect(standingsByCategory.ADMINISTRATIVE).toEqual(["PLAINTIFF", "DEFENDANT", "THIRD_PARTY"]);
    });

    it("has correct standings for LABOR_ARBITRATION", () => {
      const expected = ["ARBITRATION_CLAIMANT", "ARBITRATION_RESPONDENT", "PLAINTIFF", "DEFENDANT", "THIRD_PARTY"];
      expect(standingsByCategory.LABOR_ARBITRATION).toEqual(expected);
    });

    it("has correct standings for COMMERCIAL_ARBITRATION", () => {
      expect(standingsByCategory.COMMERCIAL_ARBITRATION).toEqual(["ARBITRATION_CLAIMANT", "ARBITRATION_RESPONDENT", "THIRD_PARTY"]);
    });

    it("has correct standings for NON_LITIGATION", () => {
      expect(standingsByCategory.NON_LITIGATION).toEqual(["NON_LITIGATION_PARTY"]);
    });

    it("has correct standings for LEGAL_COUNSEL", () => {
      expect(standingsByCategory.LEGAL_COUNSEL).toEqual(["NON_LITIGATION_PARTY"]);
    });

    it("has correct standings for SPECIAL_PROJECT", () => {
      expect(standingsByCategory.SPECIAL_PROJECT).toEqual(["NON_LITIGATION_PARTY"]);
    });
  });

  describe("matterCategoryCode", () => {
    it("maps each category to correct code", () => {
      expect(matterCategoryCode.CIVIL_COMMERCIAL).toBe("CC");
      expect(matterCategoryCode.LABOR_ARBITRATION).toBe("LA");
      expect(matterCategoryCode.COMMERCIAL_ARBITRATION).toBe("CA");
      expect(matterCategoryCode.CRIMINAL).toBe("CR");
      expect(matterCategoryCode.ADMINISTRATIVE).toBe("AD");
      expect(matterCategoryCode.NON_LITIGATION).toBe("NL");
      expect(matterCategoryCode.LEGAL_COUNSEL).toBe("GC");
      expect(matterCategoryCode.SPECIAL_PROJECT).toBe("SP");
    });
  });
});
