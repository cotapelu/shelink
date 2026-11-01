import { describe, it, expect } from "vitest";
import {
  invoiceRequestViolation,
  invoiceValidationViolation,
  buildInvoiceRequestData,
  invoiceNotificationContent,
  type InvoiceRequestInput
} from "@/server/finance/invoice-request-lib";

const base: InvoiceRequestInput = {
  matterId: "m1",
  amount: 1000000,
  invoiceType: "PLAIN",
  invoiceItem: "LAWYER_FEE",
  buyerName: "Công ty ABC",
  evidenceDocIds: ["d1"]
};

describe("invoiceRequestViolation (phân quyền theo matterId)", () => {
  it("có matterId → không vi phạm (quyền gắn vụ do assertCanAssociateMatter lo)", () => {
    expect(invoiceRequestViolation("STAFF", base)).toBeNull();
  });

  it("không matterId + vai trò thường → chặn", () => {
    expect(invoiceRequestViolation("ASSISTANT", { ...base, matterId: null })).toMatch(/Chỉ Tài chính/);
  });

  it("không matterId + FINANCE/ADMIN/PRINCIPAL_LAWYER → được (isManager thực chất chỉ ADMIN+PRINCIPAL_LAWYER)", () => {
    for (const role of ["FINANCE", "ADMIN", "PRINCIPAL_LAWYER"]) {
      expect(invoiceRequestViolation(role, { ...base, matterId: null, noMatterReason: "Khách lẻ" })).toBeNull();
    }
  });

  it("OWNER/MANAGER không có trong schema UserRole → vẫn bị chặn (đúng hành vi isManager)", () => {
    for (const role of ["OWNER", "MANAGER"]) {
      expect(invoiceRequestViolation(role, { ...base, matterId: null, noMatterReason: "Khách lẻ" })).toMatch(/Chỉ Tài chính/);
    }
  });

  it("không matterId + thiếu lý do → chặn", () => {
    expect(invoiceRequestViolation("ADMIN", { ...base, matterId: null })).toMatch(/lý do/);
    expect(invoiceRequestViolation("ADMIN", { ...base, matterId: null, noMatterReason: "   " })).toMatch(/lý do/);
  });
});

describe("invoiceValidationViolation (thứ tự message giống action gốc)", () => {
  it("amount ≤ 0", () => {
    expect(invoiceValidationViolation({ ...base, amount: 0 })).toMatch(/Số tiền/);
  });

  it("invoiceType lạ", () => {
    expect(invoiceValidationViolation({ ...base, invoiceType: "WEIRD" as never })).toMatch(/loại hóa đơn/);
  });

  it("buyerName rỗng", () => {
    expect(invoiceValidationViolation({ ...base, buyerName: "  " })).toMatch(/đơn vị mua/);
  });

  it("SPECIAL thiếu 5 yếu tố → message tương ứng (đúng thứ tự)", () => {
    expect(invoiceValidationViolation({ ...base, invoiceType: "SPECIAL" })).toMatch(/mã số thuế/);
    expect(invoiceValidationViolation({ ...base, invoiceType: "SPECIAL", buyerTaxNo: "0123" })).toMatch(/địa chỉ/);
    expect(invoiceValidationViolation({ ...base, invoiceType: "SPECIAL", buyerTaxNo: "1", buyerAddress: "HN" })).toMatch(/điện thoại/);
    expect(invoiceValidationViolation({ ...base, invoiceType: "SPECIAL", buyerTaxNo: "1", buyerAddress: "HN", buyerPhone: "09" })).toMatch(/ngân hàng mở tài khoản/);
    expect(invoiceValidationViolation({ ...base, invoiceType: "SPECIAL", buyerTaxNo: "1", buyerAddress: "HN", buyerPhone: "09", buyerBank: "VCB" })).toMatch(/số tài khoản/);
  });

  it("SPECIAL đủ → hợp lệ", () => {
    expect(invoiceValidationViolation({
      ...base, invoiceType: "SPECIAL", buyerTaxNo: "1", buyerAddress: "HN", buyerPhone: "09", buyerBank: "VCB", buyerBankAccount: "123"
    })).toBeNull();
  });

  it("có matterId nhưng không căn cứ → chặn evidence", () => {
    expect(invoiceValidationViolation({ ...base, evidenceDocIds: [] })).toMatch(/căn cứ xuất hóa đơn/);
  });

  it("không matterId thì căn cứ tùy chọn", () => {
    expect(invoiceValidationViolation({ ...base, matterId: null, evidenceDocIds: [] })).toBeNull();
  });
});

describe("buildInvoiceRequestData", () => {
  it("PLAIN: trim buyer + các field đặc biệt bị null", () => {
    const d = buildInvoiceRequestData(base, "rec1");
    expect(d).toMatchObject({
      matterId: "m1",
      noMatterReason: null,
      amount: 1000000,
      invoiceType: "PLAIN",
      buyerName: "Công ty ABC",
      buyerTaxNo: null,
      buyerAddress: null,
      buyerPhone: null,
      buyerBank: null,
      buyerBankAccount: null,
      evidenceDocIds: ["d1"],
      title: "Công ty ABC",
      requestNote: null,
      requestedById: "rec1"
    });
  });

  it("SPECIAL: giữ 4 field mua hàng đã trim", () => {
    const d = buildInvoiceRequestData({
      ...base, invoiceType: "SPECIAL", buyerTaxNo: " 0123 ", buyerAddress: " HN ", buyerPhone: " 09 ", buyerBank: " VCB ", buyerBankAccount: " 123 ", requestNote: " gấp "
    }, "rec1");
    expect(d).toMatchObject({ buyerTaxNo: "0123", buyerAddress: "HN", buyerPhone: "09", buyerBank: "VCB", buyerBankAccount: "123", requestNote: "gấp" });
  });

  it("không matterId → noMatterReason giữ lại đã trim", () => {
    const d = buildInvoiceRequestData({ ...base, matterId: null, noMatterReason: "  Khách lẻ  " }, "rec1");
    expect(d.noMatterReason).toBe("Khách lẻ");
  });
});

describe("invoiceNotificationContent", () => {
  it("có matter → mã + tiêu đề", () => {
    const c = invoiceNotificationContent("An", { internalCode: "LL-1", title: "Vụ A" }, base);
    expect(c).toContain("LL-1 Vụ A");
    expect(c).toContain("An");
    expect(c).toContain("1.000.000");
  });

  it("không matter → fallback lý do", () => {
    const c = invoiceNotificationContent("An", null, { ...base, matterId: null, noMatterReason: "Khách lẻ" });
    expect(c).toContain("Khách lẻ");
  });

  it("không matter không lý do → nhãn mặc định", () => {
    const c = invoiceNotificationContent(null, null, { ...base, matterId: null });
    expect(c).toContain("Người dùng");
    expect(c).toContain("Không liên kết vụ án");
  });
});
