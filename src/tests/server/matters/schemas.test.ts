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
import { describe, it, expect } from 'vitest';
import {
  matterCategorySchema,
  matterStatusSchema,
  litigationStandingSchema,
  procedureTypeSchema,
  partyRoleSchema,
  partyTypeSchema,
  partyInputSchema,
  matterCreateSchema,
  matterUpdateBasicSchema,
  matterListQuerySchema,
  type MatterCreateInput,
  type PartyInput,
  type MatterUpdateBasicInput,
  type MatterListQuery
} from '@/server/matters/schemas';

// CUID-like strings for tests (start with 'c', alphanumeric, length > 7)
const GEN = {
  matter: 'c123456789012345678901234567890',
  cause: 'c234567890123456789012345678901',
  client: 'c345678901234567890123456789012',
  client2: 'c456789012345678901234567890123',
  procedure: 'c567890123456789012345678901234',
  party: 'c678901234567890123456789012345',
  user: 'c789012345678901234567890123456'
};

describe('Enum Schemas', () => {
  describe('matterCategorySchema', () => {
    it('accepts all valid categories', () => {
      const valid = [
        'CIVIL_COMMERCIAL',
        'LABOR_ARBITRATION',
        'COMMERCIAL_ARBITRATION',
        'CRIMINAL',
        'ADMINISTRATIVE',
        'NON_LITIGATION',
        'LEGAL_COUNSEL',
        'SPECIAL_PROJECT'
      ];
      for (const v of valid) {
        expect(matterCategorySchema.parse(v)).toBe(v);
      }
    });

    it('rejects invalid category', () => {
      expect(() => matterCategorySchema.parse('INVALID')).toThrow();
    });
  });

  describe('matterStatusSchema', () => {
    it('accepts all valid statuses', () => {
      const valid = [
        'PENDING_ACCEPTANCE',
        'IN_PROGRESS',
        'ON_HOLD',
        'CLOSED',
        'ARCHIVED'
      ];
      for (const v of valid) {
        expect(matterStatusSchema.parse(v)).toBe(v);
      }
    });

    it('rejects invalid status', () => {
      expect(() => matterStatusSchema.parse('UNKNOWN')).toThrow();
    });
  });

  describe('litigationStandingSchema', () => {
    it('accepts all valid standings', () => {
      const valid = [
        'PLAINTIFF',
        'JOINT_PLAINTIFF',
        'DEFENDANT',
        'JOINT_DEFENDANT',
        'THIRD_PARTY',
        'COUNTERCLAIM_PLAINTIFF',
        'COUNTERCLAIM_DEFENDANT',
        'APPELLANT',
        'APPELLEE',
        'RETRIAL_APPLICANT',
        'RETRIAL_RESPONDENT',
        'ENFORCEMENT_APPLICANT',
        'EXECUTED_PERSON',
        'CRIMINAL_DEFENDANT',
        'CRIMINAL_VICTIM',
        'PRIVATE_PROSECUTOR',
        'CRIMINAL_INCIDENTAL_PLAINTIFF',
        'ARBITRATION_CLAIMANT',
        'ARBITRATION_RESPONDENT',
        'ADMIN_PLAINTIFF',
        'ADMIN_DEFENDANT',
        'ADMIN_RECONSIDERATION_APPLICANT',
        'ADMIN_RECONSIDERATION_RESPONDENT',
        'NON_LITIGATION_PARTY'
      ];
      for (const v of valid) {
        expect(litigationStandingSchema.parse(v)).toBe(v);
      }
    });
  });

  describe('procedureTypeSchema', () => {
    it('accepts all valid procedure types', () => {
      const valid = [
        'FIRST_INSTANCE',
        'SECOND_INSTANCE',
        'RETRIAL_REVIEW',
        'RETRIAL',
        'REMAND_FIRST',
        'REMAND_SECOND',
        'PROSECUTORIAL_SUPERVISION',
        'COMMERCIAL_ARBITRATION',
        'LABOR_ARBITRATION',
        'ARBITRATION_SET_ASIDE',
        'ARBITRATION_ENFORCEMENT_REVIEW',
        'ENFORCEMENT',
        'ENFORCEMENT_OBJECTION',
        'INVESTIGATION',
        'PROSECUTION_REVIEW',
        'DEATH_PENALTY_REVIEW',
        'CRIMINAL_ENFORCEMENT',
        'COMMUTATION_PAROLE_REVIEW',
        'ADMIN_RECONSIDERATION',
        'ADMIN_NON_LITIGATION_ENFORCEMENT',
        'NON_LITIGATION_PHASE',
        'CUSTOM'
      ];
      for (const v of valid) {
        expect(procedureTypeSchema.parse(v)).toBe(v);
      }
    });
  });

  describe('partyRoleSchema', () => {
    it('accepts CLIENT_PARTY, OPPOSING_PARTY, THIRD_PARTY, CO_LITIGANT, AGENT, WITNESS, OTHER', () => {
      const valid = ['CLIENT_PARTY', 'OPPOSING_PARTY', 'THIRD_PARTY', 'CO_LITIGANT', 'AGENT', 'WITNESS', 'OTHER'];
      for (const v of valid) {
        expect(partyRoleSchema.parse(v)).toBe(v);
      }
    });
  });

  describe('partyTypeSchema', () => {
    it('accepts all valid party types', () => {
      const valid = ['NATURAL_PERSON', 'ORGANIZATION', 'COMPANY', 'PARTNERSHIP', 'INDIVIDUAL_BUSINESS', 'INSTITUTION', 'SOCIAL_ORG', 'GOVERNMENT', 'OTHER_ORG'];
      for (const v of valid) {
        expect(partyTypeSchema.parse(v)).toBe(v);
      }
    });
  });
});

describe('partyInputSchema', () => {
  it('accepts valid party with NATURAL_PERSON and idNumber', () => {
    const input: PartyInput = {
      role: 'CLIENT_PARTY',
      standing: 'PLAINTIFF',
      ordinal: 1,
      partyType: 'NATURAL_PERSON',
      name: '张三',
      idNumber: '123456199001011234',
      enterpriseSocialCode: '',
      enterpriseName: '',
      phone: '',
      address: '',
      legalRep: '',
      contactName: '',
      notes: ''
    };
    expect(partyInputSchema.parse(input)).toMatchObject(input);
  });

  it('accepts valid party with COMPANY and enterpriseSocialCode', () => {
    const input: PartyInput = {
      role: 'OPPOSING_PARTY',
      standing: undefined,
      ordinal: 1,
      partyType: 'COMPANY',
      name: '测试公司',
      idNumber: '',
      enterpriseSocialCode: '91110000000000000X',
      enterpriseName: '测试公司全称',
      phone: '010-12345678',
      address: '北京市',
      legalRep: '李四',
      contactName: '王五',
      notes: '备注'
    };
    expect(partyInputSchema.parse(input)).toMatchObject(input);
  });

  it('rejects NATURAL_PERSON without idNumber (trimmed empty)', () => {
    const input: PartyInput = {
      role: 'CLIENT_PARTY',
      ordinal: 1,
      partyType: 'NATURAL_PERSON',
      name: '张三',
      idNumber: '   ',
      enterpriseSocialCode: ''
    };
    expect(() => partyInputSchema.parse(input)).toThrow("自然人需填写身份证号码");
  });

  it('rejects non-natural person without enterpriseSocialCode', () => {
    const input: PartyInput = {
      role: 'CLIENT_PARTY',
      ordinal: 1,
      partyType: 'COMPANY',
      name: '公司A',
      idNumber: '',
      enterpriseSocialCode: '   '
    };
    expect(() => partyInputSchema.parse(input)).toThrow("公司/组织需填写统一社会信用代码");
  });

  it('accepts party with missing optional standing (undefined)', () => {
    const input: PartyInput = {
      role: 'WITNESS',
      ordinal: 1,
      partyType: 'NATURAL_PERSON',
      name: '证人',
      idNumber: '123456'
    };
    expect(partyInputSchema.parse(input)).toMatchObject(input);
  });

  it('applies default ordinal=1 when missing', () => {
    const input = {
      role: 'CLIENT_PARTY' as const,
      partyType: 'NATURAL_PERSON' as const,
      name: '张三',
      idNumber: '123456'
    };
    const result = partyInputSchema.parse(input);
    expect(result.ordinal).toBe(1);
  });

  it('rejects ordinal < 1', () => {
    const input: PartyInput = {
      role: 'CLIENT_PARTY',
      partyType: 'NATURAL_PERSON',
      name: '张三',
      idNumber: '123456',
      ordinal: 0
    };
    expect(() => partyInputSchema.parse(input)).toThrow();
  });

  it('validates name max length 120', () => {
    const longName = 'a'.repeat(121);
    const input: PartyInput = {
      role: 'CLIENT_PARTY',
      ordinal: 1,
      partyType: 'NATURAL_PERSON',
      name: longName,
      idNumber: '123456'
    };
    expect(() => partyInputSchema.parse(input)).toThrow();
  });
});

describe('matterCreateSchema', () => {
  it('accepts valid matter create input', () => {
    const input: MatterCreateInput = {
      title: '离婚纠纷案',
      category: 'CIVIL_COMMERCIAL',
      causeId: GEN.cause,
      causeFreeText: '离婚纠纷',
      claimAmount: 100000,
      ourStanding: 'PLAINTIFF',
      counterclaimAsPlaintiff: false,
      counterclaimAsDefendant: false,
      intakeDate: new Date('2024-01-15'),
      clientIds: [GEN.client],
      parties: [
        {
          role: 'CLIENT_PARTY',
          standing: 'PLAINTIFF',
          ordinal: 1,
          partyType: 'NATURAL_PERSON',
          name: '张三',
          idNumber: '123456'
        }
      ],
      firstProcedure: {
        type: 'FIRST_INSTANCE',
        customLabel: '',
        caseNumber: '（2024）京0101民初1234号',
        handlingAgency: '北京市朝阳区人民法院',
        acceptedAt: new Date('2024-01-20')
      }
    };
    expect(matterCreateSchema.parse(input)).toMatchObject(input);
  });

  it('trims whitespace from title', () => {
    const input = {
      title: '  案件名称  ',
      category: 'CIVIL_COMMERCIAL' as any,
      clientIds: [GEN.client],
      firstProcedure: { type: 'FIRST_INSTANCE' as any }
    };
    const result = matterCreateSchema.parse(input);
    expect(result.title).toBe('案件名称');
  });

  it('rejects title that becomes empty after trim', () => {
    const input = {
      title: '   ',
      category: 'CIVIL_COMMERCIAL' as any,
      clientIds: [GEN.client],
      firstProcedure: { type: 'FIRST_INSTANCE' as any }
    };
    expect(() => matterCreateSchema.parse(input)).toThrow("案件名称必填");
  });

  it('rejects non-string title', () => {
    const input = {
      title: 123 as any,
      category: 'CIVIL_COMMERCIAL' as any,
      clientIds: [GEN.client],
      firstProcedure: { type: 'FIRST_INSTANCE' as any }
    };
    expect(() => matterCreateSchema.parse(input)).toThrow();
  });

  it('rejects empty clientIds', () => {
    const input = {
      title: '案件',
      category: 'CIVIL_COMMERCIAL' as any,
      clientIds: [] as any,
      firstProcedure: { type: 'FIRST_INSTANCE' as any }
    };
    expect(() => matterCreateSchema.parse(input)).toThrow("至少选择一个委托方");
  });

  it('accepts claimAmount as string that coerces to number', () => {
    const input = {
      title: '案件',
      category: 'CIVIL_COMMERCIAL' as any,
      clientIds: [GEN.client],
      claimAmount: '100000' as any,
      firstProcedure: { type: 'FIRST_INSTANCE' as any }
    };
    const result = matterCreateSchema.parse(input);
    expect(result.claimAmount).toBe(100000);
  });

  it('rejects negative claimAmount after coercion', () => {
    const input = {
      title: '案件',
      category: 'CIVIL_COMMERCIAL' as any,
      clientIds: [GEN.client],
      claimAmount: -100 as any,
      firstProcedure: { type: 'FIRST_INSTANCE' as any }
    };
    expect(() => matterCreateSchema.parse(input)).toThrow();
  });

  it('accepts causeId empty string (optional)', () => {
    const input = {
      title: '案件',
      category: 'CIVIL_COMMERCIAL' as any,
      causeId: '',
      clientIds: [GEN.client],
      firstProcedure: { type: 'FIRST_INSTANCE' as any }
    };
    expect(matterCreateSchema.parse(input)).toMatchObject(input);
  });

  it('accepts parties default []', () => {
    const input = {
      title: '案件',
      category: 'CIVIL_COMMERCIAL' as any,
      clientIds: [GEN.client],
      firstProcedure: { type: 'FIRST_INSTANCE' as any }
    };
    const result = matterCreateSchema.parse(input);
    expect(result.parties).toEqual([]);
  });

  it('validates firstProcedure.type enum', () => {
    const input = {
      title: '案件',
      category: 'CIVIL_COMMERCIAL' as any,
      clientIds: [GEN.client],
      firstProcedure: { type: 'INVALID' as any }
    };
    expect(() => matterCreateSchema.parse(input)).toThrow();
  });

  it('accepts firstProcedure with all optional fields empty', () => {
    const input = {
      title: '案件',
      category: 'CIVIL_COMMERCIAL' as any,
      clientIds: [GEN.client],
      firstProcedure: {
        type: 'FIRST_INSTANCE' as any,
        customLabel: '',
        caseNumber: '',
        handlingAgency: '',
        acceptedAt: undefined
      }
    };
    expect(matterCreateSchema.parse(input)).toMatchObject(input);
  });

  it('coerces intakeDate from string', () => {
    const input = {
      title: '案件',
      category: 'CIVIL_COMMERCIAL' as any,
      clientIds: [GEN.client],
      intakeDate: '2024-01-15' as any,
      firstProcedure: { type: 'FIRST_INSTANCE' as any }
    };
    const result = matterCreateSchema.parse(input);
    expect(result.intakeDate).toBeInstanceOf(Date);
  });
});

describe('matterUpdateBasicSchema', () => {
  it('accepts valid update input', () => {
    const input: MatterUpdateBasicInput = {
      id: GEN.matter,
      title: '更新案件名称',
      causeId: GEN.cause,
      causeFreeText: '更新案由',
      claimAmount: 200000,
      ourStanding: 'DEFENDANT'
    };
    expect(matterUpdateBasicSchema.parse(input)).toMatchObject(input);
  });

  it('trims title whitespace', () => {
    const input = {
      id: GEN.matter,
      title: '  新标题  ',
      causeId: '',
      claimAmount: null,
      ourStanding: null
    };
    const result = matterUpdateBasicSchema.parse(input);
    expect(result.title).toBe('新标题');
  });

  it('accepts nullable claimAmount and ourStanding', () => {
    const input = {
      id: GEN.matter,
      title: '案件',
      causeId: '',
      claimAmount: null,
      ourStanding: null
    };
    expect(matterUpdateBasicSchema.parse(input)).toMatchObject(input);
  });

  it('rejects missing id', () => {
    const input = {
      title: '案件',
      causeId: ''
    } as any;
    expect(() => matterUpdateBasicSchema.parse(input)).toThrow();
  });
});

describe('matterListQuerySchema', () => {
  it('accepts default values', () => {
    const input = {};
    const result = matterListQuerySchema.parse(input);
    expect(result.sortBy).toBe('intakeDate');
    expect(result.sortDir).toBe('desc');
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('accepts query with category filter', () => {
    const input = { category: 'CIVIL_COMMERCIAL' as any };
    expect(matterListQuerySchema.parse(input)).toMatchObject(input);
  });

  it('accepts query with status filter', () => {
    const input = { status: 'IN_PROGRESS' as any };
    expect(matterListQuerySchema.parse(input)).toMatchObject(input);
  });

  it('accepts query with statusIn array', () => {
    const input = { statusIn: ['IN_PROGRESS', 'CLOSED'] as any };
    expect(matterListQuerySchema.parse(input)).toMatchObject(input);
  });

  it('accepts query with statusNotIn array', () => {
    const input = { statusNotIn: ['PENDING_ACCEPTANCE'] as any };
    expect(matterListQuerySchema.parse(input)).toMatchObject(input);
  });

  it('accepts query with sortBy and sortDir', () => {
    const input = { sortBy: 'claimAmount' as any, sortDir: 'asc' as any };
    expect(matterListQuerySchema.parse(input)).toMatchObject(input);
  });

  it('accepts query with pagination', () => {
    const input = { page: 2, pageSize: 50 };
    expect(matterListQuerySchema.parse(input)).toMatchObject(input);
  });

  it('rejects pageSize > 100', () => {
    const input = { pageSize: 101 } as any;
    expect(() => matterListQuerySchema.parse(input)).toThrow();
  });

  it('rejects pageSize < 1', () => {
    const input = { pageSize: 0 } as any;
    expect(() => matterListQuerySchema.parse(input)).toThrow();
  });

  it('rejects invalid sortBy', () => {
    const input = { sortBy: 'invalid' as any };
    expect(() => matterListQuerySchema.parse(input)).toThrow();
  });

  it('rejects invalid sortDir', () => {
    const input = { sortDir: 'invalid' as any };
    expect(() => matterListQuerySchema.parse(input)).toThrow();
  });
});
