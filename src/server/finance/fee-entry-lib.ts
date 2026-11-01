/*
 * Hàm thuần cho createFeeEntry — tách khỏi action để test (R-refactor AUTO-58).
 * Không import Prisma/DB: chỉ dựng dữ liệu + tính tiền.
 */

import type { FeeEntryType, Prisma } from "@prisma/client";
import type { FeeEntryCreateInput } from "./schemas";

/** Plan hoa hồng đang active (hình dạng tối thiản cần dùng; percent là Decimal từ Prisma). */
export type CommissionPlanRow = {
  id: string;
  userId: string;
  percent: Prisma.Decimal | number;
  label: string | null;
};

export type FeeEntryRowData = {
  matterId: string;
  billingId: string | null;
  type: FeeEntryType;
  amount: number;
  occurredAt: Date;
  invoiceNo?: string | null;
  payerOrPayee?: string | null;
  method?: string | null;
  note?: string | null;
  parentFeeEntryId?: string;
  beneficiaryUserId?: string;
  recordedById: string;
};

/** Chỉ split hoa hồng khi là RECEIVED và số tiền dương. */
export function shouldSplitCommission(type: FeeEntryType | string, amount: number): boolean {
  return type === "RECEIVED" && amount > 0;
}

/** Phần hoa hồng của 1 người theo % (làm tròn 2 số); ≤0 → null (bỏ qua). */
export function commissionShare(percent: Prisma.Decimal | number, amount: number): number | null {
  const share = (Number(percent) * amount) / 100;
  if (share <= 0) return null;
  return Number(share.toFixed(2));
}

/** Nhãn ghi chú cho dòng hoa hồng tự động. */
export function commissionNote(plan: Pick<CommissionPlanRow, "label" | "percent">): string {
  return plan.label
    ? `Tự động chia theo phương án [${plan.label}] ${plan.percent}%`
    : `Tự động chia ${plan.percent}%`;
}

/** Payload tạo bản ghi thu chi chính. */
export function buildFeeEntryData(data: FeeEntryCreateInput, recordedById: string): FeeEntryRowData {
  return {
    matterId: data.matterId,
    billingId: data.billingId || null,
    type: data.type,
    amount: data.amount,
    occurredAt: data.occurredAt,
    invoiceNo: data.invoiceNo || null,
    payerOrPayee: data.payerOrPayee || null,
    method: data.method || null,
    note: data.note || null,
    recordedById
  };
}

/** Tham số cho buildCommissionData. */
export interface CommissionBuildArgs {
  plan: CommissionPlanRow;
  amount: number;
  parentId: string;
  recordedById: string;
  matterId: string;
  billingId: string | null;
  occurredAt: Date;
}

/** Payload tạo dòng con COMMISSION cho 1 plan (null nếu phần chia ≤0). */
export function buildCommissionData(args: CommissionBuildArgs): FeeEntryRowData | null {
  const share = commissionShare(args.plan.percent, args.amount);
  if (share === null) return null;
  return {
    matterId: args.matterId,
    billingId: args.billingId,
    type: "COMMISSION",
    amount: share,
    occurredAt: args.occurredAt,
    parentFeeEntryId: args.parentId,
    beneficiaryUserId: args.plan.userId,
    note: commissionNote(args.plan),
    recordedById: args.recordedById
  };
}

/** Payload sự kiện dòng thời gian khi thu tiền. */
export function feeReceivedTimelineData(data: FeeEntryCreateInput) {
  return {
    matterId: data.matterId,
    eventType: "FEE_RECEIVED",
    title: `Đã thu ¥${data.amount.toLocaleString("vi-VN")}`,
    content: data.note ?? undefined,
    occurredAt: data.occurredAt
  };
}
