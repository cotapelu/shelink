/**
 * Kiểu + hằng dùng chung cho module Quản lý Quỹ.
 */

export type CashAccountType = "CASH" | "BANK" | "EWALLET";

export type CashAccountRow = {
  id: string;
  name: string;
  type: CashAccountType;
  currency: string;
  openingBalance: { toString(): string };
  balance: number;
  bankName: string | null;
  accountNoMasked: string | null;
  note: string | null;
  active: boolean;
};

export const TYPE_LABEL: Record<CashAccountType, string> = {
  CASH: "Tiền mặt",
  BANK: "Ngân hàng",
  EWALLET: "Ví điện tử"
};
