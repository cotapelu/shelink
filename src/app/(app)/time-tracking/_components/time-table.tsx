import type { TimeRow } from "./time-grid";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  SUBMITTED: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối"
};

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

/** Bảng ghi giờ (UI-DESIGN §7.9). */
export function TimeTable({ rows }: { rows: TimeRow[] }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left">Ngày</th><th className="px-4 py-2 text-left">Dự án / nhiệm vụ</th>
            <th className="px-4 py-2 text-left">Nội dung</th><th className="px-4 py-2 text-left">Người ghi</th>
            <th className="px-4 py-2 text-left">Trạng thái</th><th className="px-4 py-2 text-right">Giờ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-4 py-2 font-mono text-xs">{new Date(r.date).toLocaleDateString("vi-VN")}</td>
              <td className="px-4 py-2">{r.matterLabel ?? "—"}</td>
              <td className="px-4 py-2 text-muted-foreground">{r.description ?? "—"}</td>
              <td className="px-4 py-2">{r.userName ?? "—"}</td>
              <td className="px-4 py-2">
                <span className="rounded bg-muted px-2 py-0.5 text-xs">{STATUS_LABELS[r.status] ?? r.status}</span>
                {r.billable && <span className="ml-1 text-[10px] text-primary">billable</span>}
              </td>
              <td className="px-4 py-2 text-right font-mono tabular-nums">{fmt(r.hours)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Chưa có ghi giờ.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
