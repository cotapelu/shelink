import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listQuotes } from "@/server/quotes/actions";
import { listClients } from "@/server/clients/actions";
import { QuoteFormSheet } from "./_components/quote-form-sheet";
import { QuotesTable } from "./_components/quotes-table";

const STATUS_TABS = ["", "DRAFT", "SENT", "ACCEPTED", "CONVERTED", "REJECTED"] as const;
const TAB_LABELS: Record<string, string> = {
  "": "Tất cả",
  DRAFT: "Nháp",
  SENT: "Đã gửi",
  ACCEPTED: "Đã đạt",
  CONVERTED: "Đã chuyển",
  REJECTED: "Từ chối"
};

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireSession();
  const params = await searchParams;
  const [{ rows, total }, clientsResult] = await Promise.all([
    listQuotes({ status: params.status as never, search: params.q }),
    listClients({ pageSize: 200 })
  ]);
  const clients = clientsResult.items.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-medium">Báo giá</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Theo dõi báo giá gửi khách hàng và chuyển thành hợp đồng/dự án. ({total})
          </p>
        </div>
        <QuoteFormSheet clients={clients} />
      </header>

      <nav className="flex gap-1 text-xs">
        {STATUS_TABS.map((s) => (
          <Link
            key={s || "all"}
            href={s ? `/quotes?status=${s}` : "/quotes"}
            className={`rounded-md px-2.5 py-1 ${(params.status ?? "") === s ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
          >
            {TAB_LABELS[s] ?? s}
          </Link>
        ))}
      </nav>

      <QuotesTable
        rows={rows.map((q) => ({
          id: q.id,
          code: q.code,
          title: q.title,
          status: q.status,
          currency: q.currency,
          total: Number(q.total),
          clientName: q.client?.name ?? null
        }))}
      />
    </div>
  );
}
