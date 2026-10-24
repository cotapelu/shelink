import { requireSession } from "@/lib/auth/session";
import { listExpenses } from "@/server/expenses/actions";
import { listMatters } from "@/server/matters/actions";
import { ExpenseFormSheet, ExpensesTable, type ExpenseRow } from "./_components/expenses-ui";

const STATUS_TABS = ["", "DRAFT", "SUBMITTED", "APPROVED", "PAID", "REJECTED"] as const;
const TAB_LABELS: Record<string, string> = {
  "": "Tất cả",
  DRAFT: "Nháp",
  SUBMITTED: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  PAID: "Đã chi",
  REJECTED: "Từ chối"
};

const CAN_APPROVE = ["ADMIN", "OWNER", "MANAGER", "FINANCE"];

export default async function ExpensesPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const [{ rows }, matters] = await Promise.all([
    listExpenses({ status: params.status as never, pageSize: 100 }),
    listMatters({ pageSize: 200 })
  ]);
  const canApprove = CAN_APPROVE.includes(session.user.role ?? "");

  const tableRows: ExpenseRow[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    category: r.category,
    amount: Number(r.amount),
    status: r.status,
    occurredAt: r.occurredAt,
    claimantName: r.claimantUser?.name ?? null,
    matterLabel: r.matter ? (r.matter.internalCode ?? r.matter.title) : null
  }));

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-medium">Chi phí</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Phiếu chi / đề nghị thanh toán; khi chi tiền sẽ sinh ghi chép chi vào dự án (nếu có).
          </p>
        </div>
        <ExpenseFormSheet
          matters={matters.items.map((m) => ({ id: m.id, label: m.internalCode ?? m.title }))}
        />
      </header>

      <ExpenseTabs active={params.status ?? ""} />

      <ExpensesTable rows={tableRows} canApprove={canApprove} />
    </div>
  );
}

function ExpenseTabs({ active }: { active: string }) {
  return (
    <nav className="flex gap-1 text-xs">
      {STATUS_TABS.map((s) => (
        <a
          key={s || "all"}
          href={s ? `/expenses?status=${s}` : "/expenses"}
          className={`rounded-md px-2.5 py-1 ${active === s ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
        >
          {TAB_LABELS[s] ?? s}
        </a>
      ))}
    </nav>
  );
}
