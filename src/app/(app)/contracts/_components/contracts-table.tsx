import Link from "next/link";
import { ContractStatusBadge } from "./contract-status-badge";

export interface ContractRow {
  id: string;
  code: string;
  title: string;
  status: string;
  currency: string;
  amount: number;
  expiresAt: Date | null;
  clientName: string | null;
}

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 0 });

/** Danh sách hợp đồng + cảnh báo cận hạn (UI-DESIGN §7.8). */
export function ContractsTable({ rows }: { rows: ContractRow[] }) {
  const now = new Date();
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left">Mã</th><th className="px-4 py-2 text-left">Tiêu đề</th>
            <th className="px-4 py-2 text-left">Khách hàng</th><th className="px-4 py-2 text-left">Trạng thái</th>
            <th className="px-4 py-2 text-right">Giá trị</th><th className="px-4 py-2 text-left">Hết hạn</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const nearExpiry =
              c.expiresAt != null &&
              (c.status === "ACTIVE" || c.status === "SIGNED" || c.status === "RENEWED") &&
              new Date(c.expiresAt) > now &&
              new Date(c.expiresAt).getTime() - now.getTime() < 30 * 86400000;
            return (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-2 font-mono text-xs">
                  <Link href={`/contracts/${c.id}`} className="hover:underline">{c.code}</Link>
                </td>
                <td className="px-4 py-2">
                  <Link href={`/contracts/${c.id}`} className="hover:underline">{c.title}</Link>
                </td>
                <td className="px-4 py-2">{c.clientName ?? "—"}</td>
                <td className="px-4 py-2"><ContractStatusBadge status={c.status} /></td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">{fmt(c.amount)} {c.currency}</td>
                <td className="px-4 py-2">
                  {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("vi-VN") : "—"}
                  {nearExpiry && <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">Sắp hết hạn</span>}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Chưa có hợp đồng.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
