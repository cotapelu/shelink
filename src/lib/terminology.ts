/**
 * Thuật ngữ hiển thị cấu hình được (PRD quyết định #22, TD-G1).
 * Schema/model Prisma giữ nguyên tên gốc; chỉ lớp UI đổi nhãn.
 *
 * Lưu trong SystemSetting(key="terminology", value: { terms: { matter: "Dự án", ... } }).
 */

export type TermKey =
  | "matter"
  | "client"
  | "contact"
  | "party"
  | "cause"
  | "procedure"
  | "quote"
  | "contract"
  | "timesheet"
  | "expense"
  | "intake"
  | "seal"
  | "archive";

export const DEFAULT_TERMS: Record<TermKey, string> = {
  matter: "Dự án",
  client: "Khách hàng",
  contact: "Liên hệ",
  party: "Bên liên quan",
  cause: "Danh mục việc",
  procedure: "Giai đoạn",
  quote: "Báo giá",
  contract: "Hợp đồng",
  timesheet: "Ghi giờ",
  expense: "Chi phí",
  intake: "Tiếp nhận",
  seal: "Phê duyệt",
  archive: "Lưu trữ"
};

export interface TerminologyMap {
  [key: string]: string;
}

export type TerminologyValue = { terms: TerminologyMap; version: number };

/** Gộp cấu hình lưu với mặc định; bỏ qua rỗng/không hợp lệ. */
export function resolveTerms(stored?: TerminologyMap | null): Record<TermKey, string> {
  const terms: Record<TermKey, string> = { ...DEFAULT_TERMS };
  if (stored) {
    for (const key of Object.keys(DEFAULT_TERMS) as TermKey[]) {
      const value = stored[key]?.trim();
      if (value) terms[key] = value;
    }
  }
  return terms;
}

export function terminologySchemaValue(terms: TerminologyMap): TerminologyValue {
  return { terms, version: 1 };
}
