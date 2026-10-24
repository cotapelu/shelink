import { requireSession } from "@/lib/auth/session";
import { listContracts } from "@/server/contracts/actions";
import { ContractsTable } from "./_components/contracts-table";

const STATUS_TABS = ["", "DRAFT", "REVIEW", "SIGNED", "ACTIVE", "TERMINATED"] as const;
const TAB_LABELS: Record<string, string> = {
  "": "Tất cả",
  DRAFT: "Nháp",
  REVIEW: "Review",
  SIGNED: "Đã ký",
  ACTIVE: "Hiệu lực",
  TERMINATED: "Chấm dứt"
};

export default async function ContractsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const { rows, total } = await listContracts({ status: params.status as never, pageSize: 100 });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-medium">Hợp đồng</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Vòng đời hợp đồng: nháp → review → ký → hiệu lực → gia hạn/hết hạn. ({total})
        </p>
      </header>

      <nav className="flex gap-1 text-xs">
        {STATUS_TABS.map((s) => (
          <a
            key={s || "all"}
            href={s ? `/contracts?status=${s}` : "/contracts"}
            className={`rounded-md px-2.5 py-1 ${(params.status ?? "") === s ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
          >
            {TAB_LABELS[s] ?? s}
          </a>
        ))}
      </nav>

      <ContractsTable
        rows={rows.map((c) => ({
          id: c.id,
          code: c.code,
          title: c.title,
          status: c.status,
          currency: c.currency,
          amount: Number(c.amount),
          expiresAt: c.expiresAt,
          clientName: c.client?.name ?? null
        }))}
      />
    </div>
  );
}
