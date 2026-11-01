/*
 * Hàm thuần cho thống kê tài chính — tách khỏi action để test (R-refactor AUTO-61).
 * Không import Prisma/DB; nhận dữ liệu đã query, trả số liệu/bucket.
 */

/** Dòng amount kiểu Decimal từ Prisma (hoặc number/string đã ép). */
type AmountLike = number | string | { toNumber?: () => number };

/** Ép Decimal-like → number (bắt lỗi dữ liệu lạ → 0). */
function toAmount(value: AmountLike): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") return Number(value) || 0;
  if (value && typeof value.toNumber === "function") return value.toNumber() || 0;
  return 0;
}

export type MatterFinanceStatsInput = {
  billings: Array<{ contractAmount: AmountLike }>;
  entries: Array<{ type: string; amount: AmountLike }>;
  issuedInvoices: Array<{ amount: AmountLike }>;
};

export type MatterFinanceStats = {
  contractAmount: number;
  receivable: number;
  received: number;
  refund: number;
  cost: number;
  commission: number;
  invoiced: number;
};

/** Tổng hợp số liệu tài chính của 1 vụ (hợp đồng + thu chi theo loại + đã xuất HĐ). */
export function computeMatterFinanceStats(input: MatterFinanceStatsInput): MatterFinanceStats {
  const sumByType = (type: string): number =>
    input.entries.filter((e) => e.type === type).reduce((acc, e) => acc + toAmount(e.amount), 0);
  return {
    contractAmount: input.billings.reduce((acc, b) => acc + toAmount(b.contractAmount), 0),
    receivable: sumByType("RECEIVABLE"),
    received: sumByType("RECEIVED"),
    refund: sumByType("REFUND"),
    cost: sumByType("COST"),
    commission: sumByType("COMMISSION"),
    invoiced: input.issuedInvoices.reduce((acc, i) => acc + toAmount(i.amount), 0)
  };
}

/** Mốc bắt đầu cửa sổ doanh thu: lùi (months-1) tháng, neo ngày mùng 1. */
export function revenueWindowStart(now: Date, months: number): Date {
  return new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
}

/** Chênh lệch tháng tuyệt đối giữa hai mốc (dùng để map entry → bucket). */
export function monthOffset(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
}

/** Mùng 1 00:00 của tháng hiện tại. */
export function monthStartOf(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** Mùng 1 tháng 1 của năm hiện tại. */
export function yearStartOf(now: Date): Date {
  return new Date(now.getFullYear(), 0, 1);
}

export type MonthlyBucket = { month: string; received: number; receivable: number };

export type MonthlyRevenueEntry = { type: string; amount: AmountLike; occurredAt: Date };

/** Dựng các bucket tháng (label "Tháng x") và phân bổ entry vào đúng tháng. */
export function buildMonthlyRevenueBuckets(
  start: Date,
  months: number,
  entries: MonthlyRevenueEntry[]
): MonthlyBucket[] {
  const buckets: MonthlyBucket[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    buckets.push({ month: `Tháng ${d.getMonth() + 1}`, received: 0, receivable: 0 });
  }
  for (const e of entries) {
    const idx = monthOffset(start, new Date(e.occurredAt));
    if (idx < 0 || idx >= months) continue;
    if (e.type === "RECEIVED") buckets[idx].received += toAmount(e.amount);
    if (e.type === "RECEIVABLE") buckets[idx].receivable += toAmount(e.amount);
  }
  return buckets;
}
