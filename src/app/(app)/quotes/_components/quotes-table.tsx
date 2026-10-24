import Link from "next/link";
import { QuoteStatusBadge } from "./quote-status-badge";

export interface QuoteRow {
  id: string;
  code: string;
  title: string;
  status: string;
  currency: string;
  total: number;
  clientName: string | null;
}

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 0 });

export function QuotesTable({ rows }: { rows: QuoteRow[] }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left">Mã</th>
            <th className="px-4 py-2 text-left">Tiêu đề</th>
            <th className="px-4 py-2 text-left">Khách hàng</th>
            <th className="px-4 py-2 text-left">Trạng thái</th>
            <th className="px-4 py-2 text-right">Tổng</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((q) => (
            <tr key={q.id} className="border-t border-border">
              <td className="px-4 py-2 font-mono text-xs">
                <Link href={`/quotes/${q.id}`} className="hover:underline">{q.code}</Link>
              </td>
              <td className="px-4 py-2">
                <Link href={`/quotes/${q.id}`} className="hover:underline">{q.title}</Link>
              </td>
              <td className="px-4 py-2">{q.clientName ?? "—"}</td>
              <td className="px-4 py-2"><QuoteStatusBadge status={q.status} /></td>
              <td className="px-4 py-2 text-right font-mono tabular-nums">{fmt(q.total)} {q.currency}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">Chưa có báo giá.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
