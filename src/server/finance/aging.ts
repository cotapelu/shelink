/**
 * Bảng tuổi nợ (DATA-MODEL §4.31: công nợ tính từ FeeEntry RECEIVABLE trừ RECEIVED).
 * Hàm thuần, không DB — dễ test. Gom theo matter, anchor = hóa đơn công nợ xa nhất còn tồn.
 *
 * Lưu ý khái quát hóa (GĐ1): chưa phân bổ từng đồng RECEIVED vào từng RECEIVABLE
 * ( FeeEntry chưa liên kết 1-1 ). Nên outstanding = ΣRECEIVABLE − ΣRECEIVED theo từng matter,
 * tuổi nợ lấy từ RECEIVABLE xa nhất — xấp xỉ bảo thủ, đủ dùng V1.
 */

export type AgingBucketKey = "b0_30" | "b31_60" | "b61_90" | "b90plus";

export const AGING_BUCKETS: { key: AgingBucketKey; label: string }[] = [
  { key: "b0_30", label: "0–30 ngày" },
  { key: "b31_60", label: "31–60 ngày" },
  { key: "b61_90", label: "61–90 ngày" },
  { key: "b90plus", label: "> 90 ngày" }
];

const DAY_MS = 86400000;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function bucketForAgeDays(ageDays: number): AgingBucketKey {
  if (ageDays <= 30) return "b0_30";
  if (ageDays <= 60) return "b31_60";
  if (ageDays <= 90) return "b61_90";
  return "b90plus";
}

export interface MatterAgg {
  matterId: string;
  receivable: number;
  received: number;
  anchorAt: number; // epoch ms của RECEIVABLE xa nhất
}

export interface AgingRow {
  matterId: string;
  receivable: number;
  received: number;
  outstanding: number;
  ageDays: number;
  bucket: AgingBucketKey;
}

/** Sinh dòng tuổi nợ từng matter (chỉ giữ matter còn nợ > 0). */
export function buildAgingRows(aggs: MatterAgg[], now: number): AgingRow[] {
  const rows: AgingRow[] = [];
  for (const agg of aggs) {
    const outstanding = round2(agg.receivable - agg.received);
    if (outstanding <= 0) continue;
    const ageDays = Math.max(0, Math.floor((now - agg.anchorAt) / DAY_MS));
    rows.push({
      matterId: agg.matterId,
      receivable: round2(agg.receivable),
      received: round2(agg.received),
      outstanding,
      ageDays,
      bucket: bucketForAgeDays(ageDays)
    });
  }
  return rows.sort((a, b) => b.ageDays - a.ageDays);
}

export interface AgingBucketSummary {
  key: AgingBucketKey;
  label: string;
  amount: number;
  count: number;
}

/** Tổng hợp theo khoảng tuổi nợ (đủ 4 khoảng, kể cả 0). */
export function summarizeAging(rows: AgingRow[]): AgingBucketSummary[] {
  const base = new Map<AgingBucketKey, AgingBucketSummary>(
    AGING_BUCKETS.map((b) => [b.key, { ...b, amount: 0, count: 0 }])
  );
  for (const row of rows) {
    const bucket = base.get(row.bucket)!;
    bucket.amount = round2(bucket.amount + row.outstanding);
    bucket.count += 1;
  }
  return AGING_BUCKETS.map((b) => base.get(b.key)!);
}
