"use client";

/**
 * Bảng tuổi nợ (TD-C2): tổng hợp công nợ theo khoảng tuổi + danh sách từng dự án còn nợ.
 * Dữ liệu tính tại server (getReceivablesAging); component chỉ hiển thị. Tách sub-component ≤50 dòng.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type BucketKey = "b0_30" | "b31_60" | "b61_90" | "b90plus";

const BUCKET_COLOR: Record<BucketKey, string> = {
  b0_30: "#4ADE80",
  b31_60: "#FBBF24",
  b61_90: "#FB923C",
  b90plus: "#F87171"
};

export type AgingSummary = { key: BucketKey; label: string; amount: number; count: number };
export type AgingRowData = {
  matterId: string;
  receivable: number;
  received: number;
  outstanding: number;
  ageDays: number;
  bucket: BucketKey;
  internalCode: string;
  title: string;
  clientName: string | null;
};

export function ReceivablesAging({
  data
}: {
  data: { rows: AgingRowData[]; summary: AgingSummary[]; totalOutstanding: number };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Bảng tuổi nợ</h2>
        <p className="text-[13px] text-muted-foreground">
          Công nợ phải thu (cần thu − đã thu) theo dự án, phân theo tuổi nợ từ hóa đơn xa nhất. Tổng còn nợ:{" "}
          <span className="font-mono tabular-nums text-foreground">{formatCurrency(data.totalOutstanding)}</span>
        </p>
      </div>
      <AgingBuckets summary={data.summary} />
      {data.rows.length === 0 ? (
        <p className="rounded-xl border border-border bg-card py-12 text-center text-xs text-muted-foreground">
          Không có công nợ tồn đọng.
        </p>
      ) : (
        <AgingTable rows={data.rows} />
      )}
    </motion.div>
  );
}

function AgingBuckets({ summary }: { summary: AgingSummary[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {summary.map((b) => (
        <div key={b.key} className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BUCKET_COLOR[b.key] }} />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{b.label}</span>
          </div>
          <div className="mt-2 font-mono text-lg font-medium tabular-nums text-foreground">
            {formatCurrency(b.amount)}
          </div>
          <div className="text-[11px] text-muted-foreground">{b.count} dự án</div>
        </div>
      ))}
    </div>
  );
}

function AgingTable({ rows }: { rows: AgingRowData[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-5 py-2.5 font-medium">Dự án</th>
            <th className="px-3 py-2.5 font-medium">Khách hàng</th>
            <th className="px-3 py-2.5 text-right font-medium">Cần thu</th>
            <th className="px-3 py-2.5 text-right font-medium">Còn nợ</th>
            <th className="px-5 py-2.5 text-right font-medium">Tuổi nợ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <AgingRowView key={r.matterId} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgingRowView({ row }: { row: AgingRowData }) {
  return (
    <tr className="transition-colors hover:bg-popover">
      <td className="px-5 py-3">
        <Link href={`/matters/${row.matterId}`} className="group">
          <div className="font-mono text-[12px] text-primary group-hover:underline">{row.internalCode}</div>
          <div className="truncate text-foreground">{row.title}</div>
        </Link>
      </td>
      <td className="px-3 py-3 text-muted-foreground">{row.clientName ?? "—"}</td>
      <td className="px-3 py-3 text-right font-mono tabular-nums text-muted-foreground">{formatCurrency(row.receivable)}</td>
      <td className="px-3 py-3 text-right font-mono tabular-nums font-medium text-foreground">{formatCurrency(row.outstanding)}</td>
      <td className="px-5 py-3 text-right">
        <span
          className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium"
          style={{ borderColor: `${BUCKET_COLOR[row.bucket]}50`, color: BUCKET_COLOR[row.bucket] }}
        >
          <Clock className="h-3 w-3" />
          {row.ageDays} ngày
        </span>
      </td>
    </tr>
  );
}
