/**
 * Tính số dư quỹ (DATA-MODEL §4.31): cân quỹ = openingBalance + Σ thu − Σ chi.
 * Hàm thuần, không DB — dễ test.
 *
 * Phân loại luồng tiền quỹ trên FeeEntry:
 * - Thu vào: RECEIVED
 * - Chi ra: COST (chi phí), REFUND (hoàn tiền khách)
 * - KHÔNG tính: RECEIVABLE (mới ghi nhận công nợ, chưa thu), COMMISSION (phân bổ nội bộ, không qua quỹ)
 */

import type { FeeEntryType } from "@prisma/client";

const INFLOW: ReadonlySet<FeeEntryType> = new Set<FeeEntryType>(["RECEIVED"]);
const OUTFLOW: ReadonlySet<FeeEntryType> = new Set<FeeEntryType>(["COST", "REFUND"]);

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface CashFlow {
  type: FeeEntryType;
  amount: number;
}

/** Tổng luồng ròng (thu − chi); bỏ qua công nợ và phân bổ nội bộ. */
export function netCashFlow(flows: CashFlow[]): number {
  return round2(
    flows.reduce((net, f) => {
      if (INFLOW.has(f.type)) return net + f.amount;
      if (OUTFLOW.has(f.type)) return net - f.amount;
      return net;
    }, 0)
  );
}

/** Số dư quỹ tại thời điểm hiện tại. */
export function cashBalance(openingBalance: number, flows: CashFlow[]): number {
  return round2(openingBalance + netCashFlow(flows));
}

/** Gộp luồng tiền theo accountId để tính số dư từng quỹ (tránh N+1 khi map). */
export function groupFlowsByAccount(
  rows: { accountId: string; type: FeeEntryType; amount: number }[]
): Map<string, CashFlow[]> {
  const map = new Map<string, CashFlow[]>();
  for (const row of rows) {
    const list = map.get(row.accountId) ?? [];
    list.push({ type: row.type, amount: row.amount });
    map.set(row.accountId, list);
  }
  return map;
}
