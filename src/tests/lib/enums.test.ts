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
    expect(clientTypeLabel.INDIVIDUAL).toBe("自然人");
  });
  it("labels COMPANY", () => {
    expect(clientTypeLabel.COMPANY).toBe("公司");
  });
  it("labels ORGANIZATION", () => {
    expect(clientTypeLabel.ORGANIZATION).toBe("其他组织");
  });
});

describe("cooperationStatusLabel", () => {
  it("labels all states", () => {
    expect(cooperationStatusLabel.POTENTIAL).toBe("潜在");
    expect(cooperationStatusLabel.NEGOTIATING).toBe("洽谈中");
    expect(cooperationStatusLabel.SIGNED).toBe("已签约");
    expect(cooperationStatusLabel.TERMINATED).toBe("已终止");
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
    expect(genderLabel.MALE).toBe("男");
    expect(genderLabel.FEMALE).toBe("女");
  });
});

describe("GENDER_OPTIONS", () => {
  it("has MALE and FEMALE", () => {
    expect(GENDER_OPTIONS).toEqual(["MALE", "FEMALE"]);
  });
});

describe("partyTypeLabel", () => {
  it("labels NATURAL_PERSON", () => {
    expect(partyTypeLabel.NATURAL_PERSON).toBe("自然人");
  });
  it("labels COMPANY", () => {
    expect(partyTypeLabel.COMPANY).toBe("公司");
  });
  it("labels PARTNERSHIP", () => {
    expect(partyTypeLabel.PARTNERSHIP).toBe("合伙企业");
  });
  it("labels INDIVIDUAL_BUSINESS", () => {
    expect(partyTypeLabel.INDIVIDUAL_BUSINESS).toBe("个体工商户");
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
    expect(barFilingLabel.NONE).toBe("否");
    expect(barFilingLabel.COLLECTIVE).toBe("需要，涉集体案件");
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
    expect(matterCategoryLabel.CIVIL_COMMERCIAL).toBe("民商诉讼");
    expect(matterCategoryLabel.LABOR_ARBITRATION).toBe("劳动仲裁");
    expect(matterCategoryLabel.LEGAL_COUNSEL).toBe("常年顾问");
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
    expect(matterStatusLabel.PENDING_ACCEPTANCE).toBe("待启动");
    expect(matterStatusLabel.IN_PROGRESS).toBe("办理中");
    expect(matterStatusLabel.CLOSED).toBe("已结案");
  });
});

describe("intakeStatusLabel", () => {
  it("labels all intake statuses", () => {
    expect(intakeStatusLabel.INTAKE).toBe("已咨询");
    expect(intakeStatusLabel.CONVERTED).toBe("已转化");
    expect(intakeStatusLabel.DECLINED).toBe("不接案");
  });
});

describe("userRoleLabel", () => {
  it("labels all roles", () => {
    expect(userRoleLabel.ADMIN).toBe("系统管理员");
    expect(userRoleLabel.PRINCIPAL_LAWYER).toBe("主办律师");
    expect(userRoleLabel.LAWYER).toBe("经办律师");
    expect(userRoleLabel.ASSISTANT).toBe("助理");
    expect(userRoleLabel.FINANCE).toBe("财务");
  });
});

describe("litigationStandingLabel", () => {
  it("has many labels", () => {
    expect(Object.keys(litigationStandingLabel).length).toBeGreaterThan(10);
  });
  it("labels common standings", () => {
    expect(litigationStandingLabel.PLAINTIFF).toBe("原告");
    expect(litigationStandingLabel.DEFENDANT).toBe("被告");
  });
});

describe("procedureTypeLabel", () => {
  it("has labels for all procedure types", () => {
    expect(procedureTypeLabel.FIRST_INSTANCE).toBe("一审");
    expect(procedureTypeLabel.SECOND_INSTANCE).toBe("二审");
    expect(procedureTypeLabel.ENFORCEMENT).toBe("强制执行");
  });
});

describe("feeTypeLabel", () => {
  it("labels fee types", () => {
    expect(feeTypeLabel.FIXED).toBe("固定收费");
    expect(feeTypeLabel.CONTINGENCY).toBe("风险代理");
    expect(feeTypeLabel.TIMED).toBe("计时收费");
  });
});

describe("invoiceRequestStatusLabel & Color", () => {
  it("labels all statuses", () => {
    expect(invoiceRequestStatusLabel.PENDING).toBe("待财务处理");
    expect(invoiceRequestStatusLabel.APPROVED).toBe("已批准");
    expect(invoiceRequestStatusLabel.ISSUED).toBe("已开具");
    expect(invoiceRequestStatusLabel.REJECTED).toBe("已驳回");
  });
  it("has matching colors", () => {
    expect(invoiceRequestStatusColor.PENDING).toBe("#FBBF24");
    expect(invoiceRequestStatusColor.APPROVED).toBe("#5B8DEF");
  });
});

describe("procedureToStandingOptions", () => {
  it("returns all standings for null procedure", () => {
    const result = procedureToStandingOptions(null, 'ours');
    expect(result.length).toBeGreaterThan(10);
  });

  it("returns all standings for unknown procedure", () => {
    const result = procedureToStandingOptions("UNKNOWN" as any, 'ours');
    expect(result.length).toBeGreaterThan(10);
  });

  it("filters correctly for FIRST_INSTANCE ours side", () => {
    const result = procedureToStandingOptions("FIRST_INSTANCE", "ours");
    expect(result).toContain("PLAINTIFF");
    expect(result).toContain("DEFENDANT");
    expect(result).toContain("COUNTERCLAIM_PLAINTIFF");
  });

  it("filters correctly for SECOND_INSTANCE", () => {
    const result = procedureToStandingOptions("SECOND_INSTANCE", "ours");
    expect(result).toEqual(["APPELLANT", "APPELLEE", "THIRD_PARTY"]);
  });

  it("filters correctly for ENFORCEMENT", () => {
    const result = procedureToStandingOptions("ENFORCEMENT", "ours");
    expect(result).toContain("ENFORCEMENT_APPLICANT");
    expect(result).toContain("EXECUTED_PERSON");
  });

  it("handles opposite side", () => {
    const result = procedureToStandingOptions("FIRST_INSTANCE", "opposite");
    expect(result).toContain("PLAINTIFF");
    expect(result).toContain("DEFENDANT");
  });
});
