/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
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
    // @ts-expect-error - testing unknown value
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
