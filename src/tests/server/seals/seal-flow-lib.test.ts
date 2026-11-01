import { describe, it, expect } from "vitest";
import {
  canCancelSeal,
  canStampSeal,
  buildSealListWhere,
  sealApprovalContent,
  monthStampedScope
} from "@/server/seals/seal-flow-lib";

describe("canCancelSeal", () => {
  it("người tạo được rút", () => {
    expect(canCancelSeal("u1", { id: "u1", role: "LAWYER" })).toBe(true);
  });
  it("quản trị (ADMIN/PRINCIPAL_LAWYER) được rút của người khác", () => {
    expect(canCancelSeal("u1", { id: "u2", role: "ADMIN" })).toBe(true);
    expect(canCancelSeal("u1", { id: "u2", role: "PRINCIPAL_LAWYER" })).toBe(true);
  });
  it("vai trò khác không được rút của người khác", () => {
    expect(canCancelSeal("u1", { id: "u2", role: "LAWYER" })).toBe(false);
    expect(canCancelSeal("u1", { id: "u2", role: "FINANCE" })).toBe(false);
  });
});

describe("canStampSeal", () => {
  it("người yêu cầu được điền", () => {
    expect(canStampSeal({ requestedById: "u1" }, { id: "u1" }, false)).toBe(true);
  });
  it("người duyệt được điền (kể cả không phải người yêu cầu)", () => {
    expect(canStampSeal({ requestedById: "u1" }, { id: "u2" }, true)).toBe(true);
  });
  it("người lạ không được điền", () => {
    expect(canStampSeal({ requestedById: "u1" }, { id: "u2" }, false)).toBe(false);
  });
});

describe("buildSealListWhere", () => {
  const approvable = ["OFFICIAL_SEAL", "CONTRACT_SEAL"];

  it("filter status/sealType trực tiếp", () => {
    expect(buildSealListWhere({ status: "PENDING", sealType: "CONTRACT_SEAL" }, { id: "u", role: "ADMIN" }, approvable)).toEqual({
      status: "PENDING",
      sealType: "CONTRACT_SEAL"
    });
  });

  it("scope mine → chỉ của mình", () => {
    const w = buildSealListWhere({ scope: "mine" }, { id: "u9", role: "LAWYER" }, approvable);
    expect(w.requestedById).toBe("u9");
  });

  it("scope approval → in approvableTypes + PENDING", () => {
    const w = buildSealListWhere({ scope: "approval" }, { id: "u", role: "ADMIN" }, approvable);
    expect(w).toEqual({ sealType: { in: approvable }, status: "PENDING" });
  });

  it("scope chung: FINANCE chỉ thấy dấu tài chính", () => {
    expect(buildSealListWhere({}, { id: "u", role: "FINANCE" }, approvable)).toEqual({ sealType: "FINANCE_SEAL" });
  });

  it("scope chung: LAWYER/ASSISTANT chỉ thấy của mình", () => {
    expect(buildSealListWhere({}, { id: "u5", role: "LAWYER" }, approvable)).toEqual({ requestedById: "u5" });
    expect(buildSealListWhere({}, { id: "u6", role: "ASSISTANT" }, approvable)).toEqual({ requestedById: "u6" });
  });

  it("scope chung: ADMIN/PRINCIPAL_LAWYER thấy tất cả (where trắng)", () => {
    expect(buildSealListWhere({}, { id: "u", role: "ADMIN" }, approvable)).toEqual({});
    expect(buildSealListWhere({}, { id: "u", role: "PRINCIPAL_LAWYER" }, approvable)).toEqual({});
  });
});

describe("sealApprovalContent", () => {
  it("ghép tên + mã + tiêu đề + mục đích", () => {
    expect(sealApprovalContent({ requesterName: "An", code: "SEAL-1", documentTitle: "HĐ", purpose: "ký" })).toBe(
      "An da gui yeu cau dong dau: SEAL-1 · HĐ · ký"
    );
  });
  it("thiếu tên → 'Nguoi dung'", () => {
    expect(sealApprovalContent({ requesterName: null, code: "C", documentTitle: "T", purpose: "P" })).toContain("Nguoi dung");
  });
});

describe("monthStampedScope", () => {
  it("FINANCE → giới hạn FINANCE_SEAL", () => {
    const s = monthStampedScope("FINANCE", new Date());
    expect(s.sealType).toBe("FINANCE_SEAL");
    expect(s.status).toBe("STAMPED");
  });
  it("vai trò khác → không giới hạn loại", () => {
    expect(monthStampedScope("ADMIN", new Date()).sealType).toBeUndefined();
  });
});
