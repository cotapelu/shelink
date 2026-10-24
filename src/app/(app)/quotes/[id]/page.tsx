import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getQuote } from "@/server/quotes/actions";
import { QuoteActions } from "../_components/quote-actions";
import { QuoteStatusBadge } from "../_components/quote-status-badge";
import { QuoteItemsTable } from "../_components/quote-items-table";
import { QuoteMeta } from "../_components/quote-meta";

const EXPIRING_STATUSES = ["DRAFT", "SENT"];

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const quote = await getQuote(id).catch(() => null);
  if (!quote) notFound();

  const expired =
    EXPIRING_STATUSES.includes(quote.status) && quote.expiresAt != null && new Date(quote.expiresAt) < new Date();

  return (
    <div className="space-y-5 max-w-4xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium">{quote.title}</h1>
            <QuoteStatusBadge status={quote.status} />
            {expired && <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs text-red-300">Hết hạn</span>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-mono">{quote.code}</span> · Khách hàng:{" "}
            <Link href={`/clients/${quote.client.id}`} className="hover:underline">{quote.client.name}</Link>
            {quote.matter && (
              <> · Dự án: <Link href={`/matters/${quote.matter.id}`} className="hover:underline">{quote.matter.internalCode ?? quote.matter.title}</Link></>
            )}
          </p>
        </div>
        <QuoteActions id={quote.id} status={quote.status} />
      </header>

      <QuoteItemsTable
        items={quote.items.map((it) => ({
          id: it.id,
          name: it.name,
          unit: it.unit ?? null,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          amount: Number(it.amount)
        }))}
        currency={quote.currency}
        subtotal={Number(quote.subtotal)}
        discountPercent={Number(quote.discountPercent)}
        taxPercent={Number(quote.taxPercent)}
        total={Number(quote.total)}
      />

      <QuoteMeta issuedAt={quote.issuedAt} expiresAt={quote.expiresAt} note={quote.note} />
    </div>
  );
}
