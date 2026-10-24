import { requireSession } from "@/lib/auth/session";
import { listMyTimeEntries } from "@/server/time-entries/actions";
import { listMatters } from "@/server/matters/actions";
import { TimeGrid } from "./_components/time-grid";
import { TimeEntrySheet } from "./_components/time-entry-sheet";

const MANAGERS = ["ADMIN", "OWNER", "MANAGER"];

const fmtHours = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

export default async function TimeTrackingPage() {
  const session = await requireSession();
  const canApprove = MANAGERS.includes(session.user.role ?? "");
  const [entries, matters] = await Promise.all([
    listMyTimeEntries({ scope: canApprove ? "all" : "mine" }),
    listMatters({ pageSize: 200 })
  ]);

  const rows = entries.map((e) => ({
    id: e.id,
    date: e.date,
    hours: Number(e.hours),
    billable: e.billable,
    status: e.status,
    activityType: e.activityType,
    description: e.description,
    userName: e.user?.name ?? null,
    matterLabel: e.matter ? (e.matter.internalCode ?? e.matter.title) : (e.workTask?.title ?? null)
  }));

  const totalHours = rows.reduce((s, r) => s + r.hours, 0);
  const billableHours = rows.filter((r) => r.billable).reduce((s, r) => s + r.hours, 0);

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-medium">Ghi giờ</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Tổng: <span className="font-mono tabular-nums">{fmtHours(totalHours)}h</span> · Billable:{" "}
            <span className="font-mono tabular-nums">{fmtHours(billableHours)}h</span>
            {canApprove ? " · bạn có quyền duyệt" : ""}
          </p>
        </div>
        <TimeEntrySheet matters={matters.items.map((m) => ({ id: m.id, label: m.internalCode ?? m.title }))} />
      </header>

      <TimeGrid rows={rows} canApprove={canApprove} />
    </div>
  );
}
