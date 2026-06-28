/// <reference types="vitest/globals" />

import { describe, it, expect } from 'vitest';
import { procedureToStandingOptions } from '@/lib/enums';

// All possible LitigationStanding values
const allStandings = [
  "PLAINTIFF",
  "JOINT_PLAINTIFF",
  "DEFENDANT",
  "JOINT_DEFENDANT",
  "THIRD_PARTY",
  "COUNTERCLAIM_PLAINTIFF",
  "COUNTERCLAIM_DEFENDANT",
  "APPELLANT",
  "APPELLEE",
  "RETRIAL_APPLICANT",
  "RETRIAL_RESPONDENT",
  "ENFORCEMENT_APPLICANT",
  "EXECUTED_PERSON",
  "CRIMINAL_DEFENDANT",
  "CRIMINAL_VICTIM",
  "PRIVATE_PROSECUTOR",
  "CRIMINAL_INCIDENTAL_PLAINTIFF",
  "ARBITRATION_CLAIMANT",
  "ARBITRATION_RESPONDENT",
  "ADMIN_PLAINTIFF",
  "ADMIN_DEFENDANT",
  "ADMIN_RECONSIDERATION_APPLICANT",
  "ADMIN_RECONSIDERATION_RESPONDENT",
  "NON_LITIGATION_PARTY"
] as const;

describe('procedureToStandingOptions (full branch coverage)', () => {
  it('returns all standings for null input', () => {
    const result = procedureToStandingOptions(null, 'ours');
    expect([...result].sort()).toEqual([...allStandings].sort());
  });

  it('returns all standings for undefined input', () => {
    const result = procedureToStandingOptions(undefined, 'opposite');
    expect([...result].sort()).toEqual([...allStandings].sort());
  });

  it('returns all standings for unknown procedure (default case)', () => {
    // @ts-ignore - testing unknown value
    const result = procedureToStandingOptions('UNKNOWN_PROCEDURE', 'ours');
    expect([...result].sort()).toEqual([...allStandings].sort());
  });

  describe('FIRST_INSTANCE and REMAND_FIRST', () => {
    it.each(['FIRST_INSTANCE', 'REMAND_FIRST'])('returns same for both sides for %s', (proc) => {
      const ours = procedureToStandingOptions(proc as any, 'ours');
      const opposite = procedureToStandingOptions(proc as any, 'opposite');
      expect(ours).toEqual(opposite);
      expect(ours).toEqual([
        "PLAINTIFF",
        "DEFENDANT",
        "THIRD_PARTY",
        "COUNTERCLAIM_PLAINTIFF",
        "COUNTERCLAIM_DEFENDANT"
      ]);
    });
  });

  describe('SECOND_INSTANCE and REMAND_SECOND', () => {
    it('ignores side and returns APPELLANT, APPELLEE, THIRD_PARTY', () => {
      ['SECOND_INSTANCE', 'REMAND_SECOND'].forEach(proc => {
        const ours = procedureToStandingOptions(proc as any, 'ours');
        const opposite = procedureToStandingOptions(proc as any, 'opposite');
        expect(ours).toEqual(opposite);
        expect(ours).toEqual(["APPELLANT", "APPELLEE", "THIRD_PARTY"]);
      });
    });
  });

  describe('RETRIAL_REVIEW and RETRIAL', () => {
    it('ignores side and returns RETRIAL_APPLICANT, RETRIAL_RESPONDENT, THIRD_PARTY', () => {
      ['RETRIAL_REVIEW', 'RETRIAL'].forEach(proc => {
        const ours = procedureToStandingOptions(proc as any, 'ours');
        const opposite = procedureToStandingOptions(proc as any, 'opposite');
        expect(ours).toEqual(opposite);
        expect(ours).toEqual(["RETRIAL_APPLICANT", "RETRIAL_RESPONDENT", "THIRD_PARTY"]);
      });
    });
  });

  describe('PROSECUTORIAL_SUPERVISION', () => {
    it('returns RETRIAL_APPLICANT, RETRIAL_RESPONDENT, THIRD_PARTY (side ignored)', () => {
      const result = procedureToStandingOptions("PROSECUTORIAL_SUPERVISION" as any, 'ours');
      expect(result).toEqual(["RETRIAL_APPLICANT", "RETRIAL_RESPONDENT", "THIRD_PARTY"]);
    });
  });

  describe('COMMERCIAL_ARBITRATION and LABOR_ARBITRATION', () => {
    it('includes THIRD_PARTY and arbitration roles', () => {
      ['COMMERCIAL_ARBITRATION', 'LABOR_ARBITRATION'].forEach(proc => {
        const result = procedureToStandingOptions(proc as any, 'ours');
        expect(result).toContain("ARBITRATION_CLAIMANT");
        expect(result).toContain("ARBITRATION_RESPONDENT");
        expect(result).toContain("THIRD_PARTY");
        expect(result).toHaveLength(3);
      });
    });
  });

  describe('ARBITRATION_SET_ASIDE and ARBITRATION_ENFORCEMENT_REVIEW', () => {
    it('returns only arbitration roles (no THIRD_PARTY)', () => {
      ['ARBITRATION_SET_ASIDE', 'ARBITRATION_ENFORCEMENT_REVIEW'].forEach(proc => {
        const result = procedureToStandingOptions(proc as any, 'ours');
        expect(result).toEqual(["ARBITRATION_CLAIMANT", "ARBITRATION_RESPONDENT"]);
      });
    });
  });

  describe('ENFORCEMENT and ENFORCEMENT_OBJECTION', () => {
    it('returns enforcement roles plus THIRD_PARTY', () => {
      ['ENFORCEMENT', 'ENFORCEMENT_OBJECTION'].forEach(proc => {
        const result = procedureToStandingOptions(proc as any, 'ours');
        expect(result).toContain("ENFORCEMENT_APPLICANT");
        expect(result).toContain("EXECUTED_PERSON");
        expect(result).toContain("THIRD_PARTY");
        expect(result).toHaveLength(3);
      });
    });
  });

  describe('Criminal procedures', () => {
    const criminalProcedures = [
      "INVESTIGATION",
      "PROSECUTION_REVIEW",
      "DEATH_PENALTY_REVIEW",
      "CRIMINAL_ENFORCEMENT",
      "COMMUTATION_PAROLE_REVIEW"
    ];

    it('returns criminal standings (side ignored)', () => {
      criminalProcedures.forEach(proc => {
        const result = procedureToStandingOptions(proc as any, 'ours');
        expect(result).toContain("CRIMINAL_DEFENDANT");
        expect(result).toContain("CRIMINAL_VICTIM");
        expect(result).toContain("PRIVATE_PROSECUTOR");
        expect(result).toContain("CRIMINAL_INCIDENTAL_PLAINTIFF");
        expect(result).toHaveLength(4);
      });
    });
  });

  describe('ADMIN_RECONSIDERATION', () => {
    it('returns admin reconsideration roles plus THIRD_PARTY', () => {
      const result = procedureToStandingOptions("ADMIN_RECONSIDERATION" as any, 'ours');
      expect(result).toContain("ADMIN_RECONSIDERATION_APPLICANT");
      expect(result).toContain("ADMIN_RECONSIDERATION_RESPONDENT");
      expect(result).toContain("THIRD_PARTY");
      expect(result).toHaveLength(3);
    });
  });

  describe('ADMIN_NON_LITIGATION_ENFORCEMENT', () => {
    it('returns ADMIN_PLAINTIFF, ADMIN_DEFENDANT, EXECUTED_PERSON', () => {
      const result = procedureToStandingOptions("ADMIN_NON_LITIGATION_ENFORCEMENT" as any, 'ours');
      expect(result).toEqual(["ADMIN_PLAINTIFF", "ADMIN_DEFENDANT", "EXECUTED_PERSON"]);
    });
  });

  describe('NON_LITIGATION_PHASE and CUSTOM', () => {
    it('returns only NON_LITIGATION_PARTY', () => {
      ['NON_LITIGATION_PHASE', 'CUSTOM'].forEach(proc => {
        const result = procedureToStandingOptions(proc as any, 'ours');
        expect(result).toEqual(["NON_LITIGATION_PARTY"]);
      });
    });
  });
});
