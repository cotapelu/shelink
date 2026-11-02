import { emptySealsText } from "./seals-helpers";

describe("emptySealsText", () => {
  it("returns correct message for pending tab", () => {
    expect(emptySealsText("pending", "duyệt toàn văn phòng")).toBe("Chưa có yêu cầu chờ duyệt");
  });

  it("returns correct message for processed tab", () => {
    expect(emptySealsText("processed", "duyệt toàn văn phòng")).toBe("Chưa có yêu cầu đã duyệt");
  });

  it("returns correct message for toApprove tab", () => {
    expect(emptySealsText("toApprove", "duyệt toàn văn phòng")).toBe("Chưa có yêu cầu nào chờ bạn duyệt");
  });

  it("returns correct message for firm tab", () => {
    expect(emptySealsText("firm", "duyệt toàn văn phòng")).toBe("Chưa có bản ghi duyệt toàn văn phòng");
  });

  it("returns default message for allMine tab", () => {
    expect(emptySealsText("allMine", "duyệt toàn văn phòng")).toBe("Bạn chưa có yêu cầu dùng dấu nào");
  });
});
