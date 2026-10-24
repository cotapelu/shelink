"use client";

import { QuoteTotalsBlock } from "./quote-totals-block";

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 0 });

export interface QuoteItemRow {
  id: string;
  name: string;
  unit: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
}

/** Bảng dòng hàng mức + khối tổng tiền (UI-DESIGN §7.7). */
export function QuoteItemsTable({
  items,
  currency,
  subtotal,
  discountPercent,
  taxPercent,
  total
}: {
  items: QuoteItemRow[];
  currency: string;
  subtotal: number;
  discountPercent: number;
  taxPercent: number;
  total: number;
}) {
  return (
    <>
      <section className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Hạng mục</th><th className="px-4 py-2 text-left">ĐVT</th>
              <th className="px-4 py-2 text-right">SL</th><th className="px-4 py-2 text-right">Đơn giá</th><th className="px-4 py-2 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-2">{item.name}</td>
                <td className="px-4 py-2 text-muted-foreground">{item.unit ?? "—"}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">{fmt(item.quantity)}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">{fmt(item.unitPrice)}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">{fmt(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <QuoteTotalsBlock
        currency={currency}
        subtotal={subtotal}
        discountPercent={discountPercent}
        taxPercent={taxPercent}
        total={total}
      />
    </>
  );
}
