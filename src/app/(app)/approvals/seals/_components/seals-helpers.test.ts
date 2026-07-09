import { emptySealsText } from "./seals-helpers";

describe("emptySealsText", () => {
  it("returns correct message for pending tab", () => {
    expect(emptySealsText("pending", "全所审批")).toBe("暂无待审批申请");
  });

  it("returns correct message for processed tab", () => {
    expect(emptySealsText("processed", "全所审批")).toBe("暂无已审批申请");
  });

  it("returns correct message for toApprove tab", () => {
    expect(emptySealsText("toApprove", "全所审批")).toBe("暂无待你审批的申请");
  });

  it("returns correct message for firm tab", () => {
    expect(emptySealsText("firm", "全所审批")).toBe("暂无全所审批记录");
  });

  it("returns default message for allMine tab", () => {
    expect(emptySealsText("allMine", "全所审批")).toBe("你还没有用章申请");
  });
});
