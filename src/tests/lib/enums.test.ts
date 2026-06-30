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
import { describe, it, expect } from "vitest";
import {
  clientTypeLabel,
  cooperationStatusLabel,
  COOPERATION_STATUS_OPTIONS,
  genderLabel,
  GENDER_OPTIONS,
  partyTypeLabel,
  PARTY_TYPE_OPTIONS,
  barFilingLabel,
  BAR_FILING_OPTIONS,
  matterCategoryKind,
  matterCategoryLabel,
  matterCategoryColor,
  matterCategoryShort,
  matterStatusLabel,
  intakeStatusLabel,
  userRoleLabel,
  litigationStandingLabel,
  procedureTypeLabel,
  feeTypeLabel,
  invoiceRequestStatusLabel,
  invoiceRequestStatusColor,
  procedureToStandingOptions,
  CategoryKind
} from "@/lib/enums";

describe("clientTypeLabel", () => {
  it("labels INDIVIDUAL", () => {
    expect(clientTypeLabel.INDIVIDUAL).toBe("Cá nhân");
  });
  it("labels COMPANY", () => {
    expect(clientTypeLabel.COMPANY).toBe("Công ty");
  });
  it("labels ORGANIZATION", () => {
    expect(clientTypeLabel.ORGANIZATION).toBe("Tổ chức khác");
  });
});

describe("cooperationStatusLabel", () => {
  it("labels all states", () => {
    expect(cooperationStatusLabel.POTENTIAL).toBe("Tiềm năng");
    expect(cooperationStatusLabel.NEGOTIATING).toBe("Đang đàm phán");
    expect(cooperationStatusLabel.SIGNED).toBe("Đã ký hợp đồng");
    expect(cooperationStatusLabel.TERMINATED).toBe("Đã chấm dứt");
  });
});

describe("COOPERATION_STATUS_OPTIONS", () => {
  it("has correct order", () => {
    expect(COOPERATION_STATUS_OPTIONS).toEqual([
      "POTENTIAL",
      "NEGOTIATING",
      "SIGNED",
      "TERMINATED"
    ]);
  });
});

describe("genderLabel", () => {
  it("labels MALE and FEMALE", () => {
    expect(genderLabel.MALE).toBe("Nam");
    expect(genderLabel.FEMALE).toBe("Nữ");
  });
});

describe("GENDER_OPTIONS", () => {
  it("has MALE and FEMALE", () => {
    expect(GENDER_OPTIONS).toEqual(["MALE", "FEMALE"]);
  });
});

describe("partyTypeLabel", () => {
  it("labels NATURAL_PERSON", () => {
    expect(partyTypeLabel.NATURAL_PERSON).toBe("Cá nhân");
  });
  it("labels COMPANY", () => {
    expect(partyTypeLabel.COMPANY).toBe("Công ty");
  });
  it("labels PARTNERSHIP", () => {
    expect(partyTypeLabel.PARTNERSHIP).toBe("Hợp danh");
  });
  it("labels INDIVIDUAL_BUSINESS", () => {
    expect(partyTypeLabel.INDIVIDUAL_BUSINESS).toBe("Hộ kinh doanh cá thể");
  });
  it("labels INSTITUTION", () => {
    expect(partyTypeLabel.INSTITUTION).toBe("Đơn vị sự nghiệp");
  });
  it("labels SOCIAL_ORG", () => {
    expect(partyTypeLabel.SOCIAL_ORG).toBe("Tổ chức xã hội");
  });
  it("labels GOVERNMENT", () => {
    expect(partyTypeLabel.GOVERNMENT).toBe("Cơ quan nhà nước");
  });
  it("labels OTHER_ORG", () => {
    expect(partyTypeLabel.OTHER_ORG).toBe("Tổ chức khác");
  });
});

describe("PARTY_TYPE_OPTIONS", () => {
  it("has 8 types excluding ORGANIZATION", () => {
    expect(PARTY_TYPE_OPTIONS).toHaveLength(8);
    expect(PARTY_TYPE_OPTIONS).not.toContain("ORGANIZATION");
  });
});

describe("barFilingLabel", () => {
  it("labels NONE and others", () => {
    expect(barFilingLabel.NONE).toBe("Không");
    expect(barFilingLabel.COLLECTIVE).toBe("Cần, liên quan tập thể");
    expect(barFilingLabel.SENSITIVE).toBe("Cần, liên quan nhạy cảm");
    expect(barFilingLabel.MAJOR).toBe("Cần, liên quan lớn");
    expect(barFilingLabel.OTHER).toBe("Cần, trường hợp khác");
  });
});

describe("BAR_FILING_OPTIONS", () => {
  it("has 5 options", () => {
    expect(BAR_FILING_OPTIONS).toHaveLength(5);
  });
});

describe("matterCategoryKind", () => {
  it("classifies LEGAL_COUNSEL as counsel", () => {
    expect(matterCategoryKind("LEGAL_COUNSEL")).toBe("counsel");
  });
  it("classifies NON_LITIGATION as project", () => {
    expect(matterCategoryKind("NON_LITIGATION")).toBe("project");
  });
  it("classifies SPECIAL_PROJECT as project", () => {
    expect(matterCategoryKind("SPECIAL_PROJECT")).toBe("project");
  });
  it("classifies litigation categories as litigation", () => {
    expect(matterCategoryKind("CIVIL_COMMERCIAL")).toBe("litigation");
    expect(matterCategoryKind("LABOR_ARBITRATION")).toBe("litigation");
    expect(matterCategoryKind("COMMERCIAL_ARBITRATION")).toBe("litigation");
    expect(matterCategoryKind("CRIMINAL")).toBe("litigation");
    expect(matterCategoryKind("ADMINISTRATIVE")).toBe("litigation");
  });
});

describe("matterCategoryLabel", () => {
  it("has labels for all categories", () => {
    expect(matterCategoryLabel.CIVIL_COMMERCIAL).toBe("Dân sự - Thương mại");
    expect(matterCategoryLabel.LABOR_ARBITRATION).toBe("Lao động & Trọng tài");
    expect(matterCategoryLabel.COMMERCIAL_ARBITRATION).toBe("Thương mại & Trọng tài");
    expect(matterCategoryLabel.CRIMINAL).toBe("Hình sự");
    expect(matterCategoryLabel.ADMINISTRATIVE).toBe("Hành chính");
    expect(matterCategoryLabel.NON_LITIGATION).toBe("Phi tố tụng");
    expect(matterCategoryLabel.LEGAL_COUNSEL).toBe("Tư vấn");
    expect(matterCategoryLabel.SPECIAL_PROJECT).toBe("Dự án đặc biệt");
  });
});

describe("matterCategoryColor", () => {
  it("has colors for all categories", () => {
    const colors = Object.values(matterCategoryColor);
    expect(colors).toHaveLength(8);
    colors.forEach(color => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe("matterCategoryShort", () => {
  it("has single-char icons", () => {
    const shorts = Object.values(matterCategoryShort);
    shorts.forEach(s => expect(s).toHaveLength(1));
  });
});

describe("matterStatusLabel", () => {
  it("labels all statuses", () => {
    expect(matterStatusLabel.PENDING_ACCEPTANCE).toBe("Chờ khởi động");
    expect(matterStatusLabel.IN_PROGRESS).toBe("Đang xử lý");
    expect(matterStatusLabel.ON_HOLD).toBe("Tạm dừng");
    expect(matterStatusLabel.CLOSED).toBe("Đã kết thúc");
    expect(matterStatusLabel.ARCHIVED).toBe("Đã lưu trữ");
  });
});

describe("intakeStatusLabel", () => {
  it("labels all intake statuses", () => {
    expect(intakeStatusLabel.INTAKE).toBe("Đã tư vấn");
    expect(intakeStatusLabel.PENDING_CONFIRMATION).toBe("Chờ xác nhận");
    expect(intakeStatusLabel.CONVERTED).toBe("Đã chuyển đổi");
    expect(intakeStatusLabel.DECLINED).toBe("Từ chối");
    expect(intakeStatusLabel.NEEDS_REVISION).toBe("Chờ bổ sung");
  });
});

describe("userRoleLabel", () => {
  it("labels all roles", () => {
    expect(userRoleLabel.ADMIN).toBe("Quản trị viên");
    expect(userRoleLabel.PRINCIPAL_LAWYER).toBe("Luật sư chính");
    expect(userRoleLabel.LAWYER).toBe("Luật sư");
    expect(userRoleLabel.ASSISTANT).toBe("Trợ lý");
    expect(userRoleLabel.FINANCE).toBe("Tài chính");
  });
});

describe("litigationStandingLabel", () => {
  it("has many labels", () => {
    expect(Object.keys(litigationStandingLabel).length).toBeGreaterThan(10);
  });
  it("labels common standings", () => {
    expect(litigationStandingLabel.PLAINTIFF).toBe("Nguyên đơn");
    expect(litigationStandingLabel.JOINT_PLAINTIFF).toBe("Cùng nguyên đơn");
    expect(litigationStandingLabel.DEFENDANT).toBe("Bị đơn");
    expect(litigationStandingLabel.JOINT_DEFENDANT).toBe("Cùng bị đơn");
    expect(litigationStandingLabel.THIRD_PARTY).toBe("Người thứ ba");
  });
});

describe("procedureTypeLabel", () => {
  it("has labels for all procedure types", () => {
    expect(procedureTypeLabel.FIRST_INSTANCE).toBe("Tòa sơ thẩm");
    expect(procedureTypeLabel.SECOND_INSTANCE).toBe("Tòa phúc thẩm");
    expect(procedureTypeLabel.RETRIAL_REVIEW).toBe("Xét xử phúc thẩm");
    expect(procedureTypeLabel.RETRIAL).toBe("Xét xử giám đốc thẩm");
    expect(procedureTypeLabel.REMAND_FIRST).toBe("Trả về xét xử lần 1");
    expect(procedureTypeLabel.REMAND_SECOND).toBe("Trả về xét xử lần 2");
    expect(procedureTypeLabel.PROSECUTORIAL_SUPERVISION).toBe("Giám sát tố tụng");
    expect(procedureTypeLabel.COMMERCIAL_ARBITRATION).toBe("Trọng tài thương mại");
    expect(procedureTypeLabel.LABOR_ARBITRATION).toBe("Trọng tài lao động");
    expect(procedureTypeLabel.ARBITRATION_SET_ASIDE).toBe("Hủy phán quyết trọng tài");
    expect(procedureTypeLabel.ARBITRATION_ENFORCEMENT_REVIEW).toBe("Xem xét thi hành trọng tài");
    expect(procedureTypeLabel.ENFORCEMENT).toBe("Thi hành án");
    expect(procedureTypeLabel.ENFORCEMENT_OBJECTION).toBe("Phản đối thi hành");
    expect(procedureTypeLabel.INVESTIGATION).toBe("Điều tra");
    expect(procedureTypeLabel.PROSECUTION_REVIEW).toBe("Xét xử phúc thẩm");
    expect(procedureTypeLabel.DEATH_PENALTY_REVIEW).toBe("Xét xử án tử hình");
    expect(procedureTypeLabel.CRIMINAL_ENFORCEMENT).toBe("Thi hành hình sự");
    expect(procedureTypeLabel.COMMUTATION_PAROLE_REVIEW).toBe("Xét xét giảm án/tha tù");
    expect(procedureTypeLabel.ADMIN_RECONSIDERATION).toBe("Tái xem xét hành chính");
    expect(procedureTypeLabel.ADMIN_NON_LITIGATION_ENFORCEMENT).toBe("Thi hành hành chính phi tố tụng");
    expect(procedureTypeLabel.NON_LITIGATION_PHASE).toBe("Giai đoạn phi tố tụng");
    expect(procedureTypeLabel.CUSTOM).toBe("Tùy chỉnh");
  });
});

describe("feeTypeLabel", () => {
  it("labels fee types", () => {
    expect(feeTypeLabel.FIXED).toBe("Cố định");
    expect(feeTypeLabel.CONTINGENCY).toBe("Phụ thuộc kết quả");
    expect(feeTypeLabel.TIMED).toBe("Theo thời gian");
  });
});

describe("invoiceRequestStatusLabel & Color", () => {
  it("labels all statuses", () => {
    expect(invoiceRequestStatusLabel.PENDING).toBe("Chờ tài chính xử lý");
    expect(invoiceRequestStatusLabel.APPROVED).toBe("Đã duyệt");
    expect(invoiceRequestStatusLabel.ISSUED).toBe("Đã xuất hóa đơn");
    expect(invoiceRequestStatusLabel.REJECTED).toBe("Đã từ chối");
  });
  it("has matching colors", () => {
    expect(invoiceRequestStatusColor.PENDING).toBe("#FBBF24");
    expect(invoiceRequestStatusColor.APPROVED).toBe("#5B8DEF");
  });
});

describe('procedureToStandingOptions', () => {
  it('returns all standings for null procedure', () => {
    const result = procedureToStandingOptions(null, 'ours');
    expect(result.length).toBeGreaterThan(10);
  });

  it('returns all standings for unknown procedure', () => {
    const result = procedureToStandingOptions('UNKNOWN' as any, 'ours');
    expect(result.length).toBeGreaterThan(10);
  });

  // First instance and remand
  it('filters FIRST_INSTANCE ours', () => {
    const result = procedureToStandingOptions('FIRST_INSTANCE', 'ours');
    expect(result).toEqual([
      'PLAINTIFF', 'DEFENDANT', 'THIRD_PARTY', 'COUNTERCLAIM_PLAINTIFF', 'COUNTERCLAIM_DEFENDANT'
    ]);
  });
  it('filters REMAND_FIRST ours', () => {
    const result = procedureToStandingOptions('REMAND_FIRST', 'ours');
    expect(result).toEqual([
      'PLAINTIFF', 'DEFENDANT', 'THIRD_PARTY', 'COUNTERCLAIM_PLAINTIFF', 'COUNTERCLAIM_DEFENDANT'
    ]);
  });

  // Second instance
  it('filters SECOND_INSTANCE', () => {
    const result = procedureToStandingOptions('SECOND_INSTANCE', 'ours');
    expect(result).toEqual(['APPELLANT', 'APPELLEE', 'THIRD_PARTY']);
  });
  it('filters REMAND_SECOND', () => {
    const result = procedureToStandingOptions('REMAND_SECOND', 'ours');
    expect(result).toEqual(['APPELLANT', 'APPELLEE', 'THIRD_PARTY']);
  });

  // Retrial
  it('filters RETRIAL_REVIEW', () => {
    const result = procedureToStandingOptions('RETRIAL_REVIEW', 'ours');
    expect(result).toEqual(['RETRIAL_APPLICANT', 'RETRIAL_RESPONDENT', 'THIRD_PARTY']);
  });
  it('filters RETRIAL', () => {
    const result = procedureToStandingOptions('RETRIAL', 'ours');
    expect(result).toEqual(['RETRIAL_APPLICANT', 'RETRIAL_RESPONDENT', 'THIRD_PARTY']);
  });

  // Prosecutorial supervision
  it('filters PROSECUTORIAL_SUPERVISION', () => {
    const result = procedureToStandingOptions('PROSECUTORIAL_SUPERVISION', 'ours');
    expect(result).toEqual(['RETRIAL_APPLICANT', 'RETRIAL_RESPONDENT', 'THIRD_PARTY']);
  });

  // Arbitration
  it('filters COMMERCIAL_ARBITRATION', () => {
    const result = procedureToStandingOptions('COMMERCIAL_ARBITRATION', 'ours');
    expect(result).toEqual(['ARBITRATION_CLAIMANT', 'ARBITRATION_RESPONDENT', 'THIRD_PARTY']);
  });
  it('filters LABOR_ARBITRATION', () => {
    const result = procedureToStandingOptions('LABOR_ARBITRATION', 'ours');
    expect(result).toEqual(['ARBITRATION_CLAIMANT', 'ARBITRATION_RESPONDENT', 'THIRD_PARTY']);
  });
  it('filters ARBITRATION_SET_ASIDE', () => {
    const result = procedureToStandingOptions('ARBITRATION_SET_ASIDE', 'ours');
    expect(result).toEqual(['ARBITRATION_CLAIMANT', 'ARBITRATION_RESPONDENT']);
  });
  it('filters ARBITRATION_ENFORCEMENT_REVIEW', () => {
    const result = procedureToStandingOptions('ARBITRATION_ENFORCEMENT_REVIEW', 'ours');
    expect(result).toEqual(['ARBITRATION_CLAIMANT', 'ARBITRATION_RESPONDENT']);
  });

  // Enforcement
  it('filters ENFORCEMENT_OBJECTION', () => {
    const result = procedureToStandingOptions('ENFORCEMENT_OBJECTION', 'ours');
    expect(result).toEqual(['ENFORCEMENT_APPLICANT', 'EXECUTED_PERSON', 'THIRD_PARTY']);
  });

  // Criminal
  it('filters INVESTIGATION', () => {
    const result = procedureToStandingOptions('INVESTIGATION', 'ours');
    expect(result).toEqual([
      'CRIMINAL_DEFENDANT', 'CRIMINAL_VICTIM', 'PRIVATE_PROSECUTOR', 'CRIMINAL_INCIDENTAL_PLAINTIFF'
    ]);
  });
  it('filters PROSECUTION_REVIEW', () => {
    const result = procedureToStandingOptions('PROSECUTION_REVIEW', 'ours');
    expect(result).toEqual([
      'CRIMINAL_DEFENDANT', 'CRIMINAL_VICTIM', 'PRIVATE_PROSECUTOR', 'CRIMINAL_INCIDENTAL_PLAINTIFF'
    ]);
  });
  it('filters DEATH_PENALTY_REVIEW', () => {
    const result = procedureToStandingOptions('DEATH_PENALTY_REVIEW', 'ours');
    expect(result).toEqual([
      'CRIMINAL_DEFENDANT', 'CRIMINAL_VICTIM', 'PRIVATE_PROSECUTOR', 'CRIMINAL_INCIDENTAL_PLAINTIFF'
    ]);
  });
  it('filters CRIMINAL_ENFORCEMENT', () => {
    const result = procedureToStandingOptions('CRIMINAL_ENFORCEMENT', 'ours');
    expect(result).toEqual([
      'CRIMINAL_DEFENDANT', 'CRIMINAL_VICTIM', 'PRIVATE_PROSECUTOR', 'CRIMINAL_INCIDENTAL_PLAINTIFF'
    ]);
  });
  it('filters COMMUTATION_PAROLE_REVIEW', () => {
    const result = procedureToStandingOptions('COMMUTATION_PAROLE_REVIEW', 'ours');
    expect(result).toEqual([
      'CRIMINAL_DEFENDANT', 'CRIMINAL_VICTIM', 'PRIVATE_PROSECUTOR', 'CRIMINAL_INCIDENTAL_PLAINTIFF'
    ]);
  });

  // Administrative
  it('filters ADMIN_RECONSIDERATION', () => {
    const result = procedureToStandingOptions('ADMIN_RECONSIDERATION', 'ours');
    expect(result).toEqual(['ADMIN_RECONSIDERATION_APPLICANT', 'ADMIN_RECONSIDERATION_RESPONDENT', 'THIRD_PARTY']);
  });
  it('filters ADMIN_NON_LITIGATION_ENFORCEMENT', () => {
    const result = procedureToStandingOptions('ADMIN_NON_LITIGATION_ENFORCEMENT', 'ours');
    expect(result).toEqual(['ADMIN_PLAINTIFF', 'ADMIN_DEFENDANT', 'EXECUTED_PERSON']);
  });

  // Non-litigation and custom
  it('filters NON_LITIGATION_PHASE', () => {
    const result = procedureToStandingOptions('NON_LITIGATION_PHASE', 'ours');
    expect(result).toEqual(['NON_LITIGATION_PARTY']);
  });
  it('filters CUSTOM', () => {
    const result = procedureToStandingOptions('CUSTOM', 'ours');
    expect(result).toEqual(['NON_LITIGATION_PARTY']);
  });
});
