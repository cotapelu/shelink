/*
 * Hàm thuần cho createInvoiceRequest — tách khỏi action để test
 * (R-refactor AUTO-59; giữ ĐÚNG thứ tự & nội dung message của bản gốc).
 */

import { isManager } from "@/lib/permissions";

export type InvoiceRequestInput = {
  // matterId null = hóa đơn không liên kết vụ án (v0.43 mục 5)
  matterId: string | null;
  noMatterReason?: string | null;
  amount: number;
  invoiceType: "PLAIN" | "SPECIAL";
  invoiceItem: "LAWYER_FEE" | "CONSULTING_FEE" | "AGENCY_FEE" | "OTHER";
  buyerName: string;
  buyerTaxNo?: string | null;
  buyerAddress?: string | null;
  buyerPhone?: string | null;
  buyerBank?: string | null;
  buyerBankAccount?: string | null;
  evidenceDocIds: string[];
  requestNote?: string | null;
};

const NOT_LINKED_ROLE_ERROR = "Chỉ Tài chính / quản trị / luật sư chủ trì mới được tạo hóa đơn không liên kết vụ án";
const NOT_LINKED_REASON_ERROR = "Khi không liên kết vụ án bắt buộc phải nhập lý do";

/** 6 yếu tố bắt buộc của hóa đơn GTGT đặc biệt (điều 1 + thông báo quản lý HĐĐB). */
const SPECIAL_BUYER_CHECKS: Array<{
  key: "buyerTaxNo" | "buyerAddress" | "buyerPhone" | "buyerBank" | "buyerBankAccount";
  message: string;
}> = [
  { key: "buyerTaxNo", message: "Hóa đơn GTGT đặc biệt bắt buộc phải có mã số thuế người nộp thuế" },
  { key: "buyerAddress", message: "Hóa đơn GTGT đặc biệt bắt buộc phải có địa chỉ bên mua" },
  { key: "buyerPhone", message: "Hóa đơn GTGT đặc biệt bắt buộc phải có điện thoại bên mua" },
  { key: "buyerBank", message: "Hóa đơn GTGT đặc biệt bắt buộc phải có ngân hàng mở tài khoản" },
  { key: "buyerBankAccount", message: "Hóa đơn GTGT đặc biệt bắt buộc phải có số tài khoản ngân hàng" }
];

/** Vi phạm phân quyền theo matterId (message gốc); null = pass. */
export function invoiceRequestViolation(role: string, input: InvoiceRequestInput): string | null {
  if (input.matterId) return null;
  if (!isManager(role) && role !== "FINANCE") return NOT_LINKED_ROLE_ERROR;
  if (!input.noMatterReason?.trim()) return NOT_LINKED_REASON_ERROR;
  return null;
}

/** Trim hoặc null (dùng chung cho payload). */
function trimOrNull(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

/** Vi phạm 6 yếu tố hóa đơn đặc biệt (đúng thứ tự message gốc); null = pass. */
export function specialInvoiceViolation(input: InvoiceRequestInput): string | null {
  if (input.invoiceType !== "SPECIAL") return null;
  for (const check of SPECIAL_BUYER_CHECKS) {
    if (!trimOrNull(input[check.key])) return check.message;
  }
  return null;
}

/** Vi phạm hợp lệ dữ liệu (đúng thứ tự message gốc); null = pass. */
export function invoiceValidationViolation(input: InvoiceRequestInput): string | null {
  if (input.amount <= 0) return "Số tiền phải lớn hơn 0";
  if (input.invoiceType !== "PLAIN" && input.invoiceType !== "SPECIAL") return "Vui lòng chọn loại hóa đơn";
  if (!input.buyerName.trim()) return "Vui lòng nhập tên đơn vị mua";
  const specialViolation = specialInvoiceViolation(input);
  if (specialViolation) return specialViolation;
  if (input.matterId && input.evidenceDocIds.length === 0) {
    return "Vui lòng tải lên ít nhất một căn cứ xuất hóa đơn (hợp đồng ủy quyền bản scan...)";
  }
  return null;
}

/** Payload tạo InvoiceRequest: 4 field mua hàng chỉ giữ với hóa đơn đặc biệt. */
export function buildInvoiceRequestData(input: InvoiceRequestInput, requestedById: string) {
  const specialOnly = (value: string | null | undefined): string | null => (input.invoiceType === "SPECIAL" ? trimOrNull(value) : null);
  return {
    matterId: input.matterId,
    noMatterReason: input.matterId ? null : trimOrNull(input.noMatterReason),
    amount: input.amount,
    invoiceType: input.invoiceType,
    invoiceItem: input.invoiceItem,
    buyerName: input.buyerName.trim(),
    buyerTaxNo: trimOrNull(input.buyerTaxNo),
    buyerAddress: specialOnly(input.buyerAddress),
    buyerPhone: specialOnly(input.buyerPhone),
    buyerBank: specialOnly(input.buyerBank),
    buyerBankAccount: specialOnly(input.buyerBankAccount),
    evidenceDocIds: input.evidenceDocIds,
    title: input.buyerName.trim(),
    requestNote: trimOrNull(input.requestNote),
    requestedById
  };
}

/** Nội dung thông báo cho vai trò duyệt (matter hoặc lý do không liên kết). */
export function invoiceNotificationContent(
  actorName: string | null | undefined,
  matter: { internalCode: string; title: string } | null,
  input: InvoiceRequestInput
): string {
  const subject = matter
    ? `${matter.internalCode} ${matter.title}`
    : input.noMatterReason?.trim() || "Không liên kết vụ án";
  return `${actorName ?? "Người dùng"} đã gửi yêu cầu xuất hóa đơn: ${subject}, số tiền ${input.amount.toLocaleString("vi-VN")} đồng`;
}
