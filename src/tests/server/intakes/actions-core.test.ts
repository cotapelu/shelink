import { describe, it, expect } from "vitest";
import {
  generateTitle,
  clientTypeToPartyType,
  emptyToNull,
  requireApprover
} from "@/server/intakes/actions";

describe("generateTitle", () => {
  it("generates title with client and opposing", () => {
    const title = generateTitle("ABC公司", ["XYZ个人"], "合同纠纷");
    expect(title).toBe("ABC公司与XYZ个人合同纠纷");
  });

  it("uses placeholder for null client", () => {
    const title = generateTitle(null, ["对方"], "案件");
    expect(title).toBe("待补充委托方与对方案件");
  });

  it("uses placeholder for empty opposing", () => {
    const title = generateTitle("委托方", [], "案由");
    expect(title).toBe("委托方与待补充对方案由");
  });

  it("handles both nulls", () => {
    const title = generateTitle(null, [], "案件");
    expect(title).toBe("待补充委托方与待补充对方案件");
  });

  it("trims whitespace from all parts", () => {
    const title = generateTitle("  client  ", ["  opp  "], "  cause  ");
    expect(title).toBe("client与oppcause");
  });
});

describe("clientTypeToPartyType", () => {
  it("maps INDIVIDUAL to NATURAL_PERSON", () => {
    expect(clientTypeToPartyType("INDIVIDUAL")).toBe("NATURAL_PERSON");
  });

  it("maps COMPANY to COMPANY", () => {
    expect(clientTypeToPartyType("COMPANY")).toBe("COMPANY");
  });

  it("maps others to OTHER_ORG", () => {
    expect(clientTypeToPartyType("FIRM" as any)).toBe("OTHER_ORG");
  });
});

describe("emptyToNull", () => {
  it("converts empty strings to null", () => {
    const input = { a: "", b: "value", c: "" };
    const result = emptyToNull(input);
    expect(result).toEqual({ a: null, b: "value", c: null });
  });

  it("preserves non-string values", () => {
    const input = { a: 0, b: false, c: null };
    const result = emptyToNull(input);
    expect(result).toEqual({ a: 0, b: false, c: null });
  });
});

describe("requireApprover", () => {
  it("allows ADMIN", () => {
    expect(() => requireApprover("ADMIN")).not.toThrow();
  });

  it("allows PRINCIPAL_LAWYER", () => {
    expect(() => requireApprover("PRINCIPAL_LAWYER")).not.toThrow();
  });

  it("denies LAWYER", () => {
    expect(() => requireApprover("LAWYER")).toThrow("仅管理员或主任律师可审批收案");
  });

  it("denies ASSISTANT", () => {
    expect(() => requireApprover("ASSISTANT")).toThrow("仅管理员或主任律师可审批收案");
  });
});
