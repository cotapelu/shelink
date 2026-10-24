"use client";

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 0 });

/** Khối tổng tiền báo giá: tạm tính → chiết khấu → thuế → tổng. */
export function QuoteTotalsBlock({
  currency,
  subtotal,
  discountPercent,
  taxPercent,
  total
}: {
  currency: string;
  subtotal: number;
  discountPercent: number;
  taxPercent: number;
  total: number;
}) {
  return (
    <section className="ml-auto w-72 space-y-1 rounded-lg border border-border bg-card p-4 text-sm">
      <Row label="Tạm tính" value={subtotal} />
      <Row label={`Chiết khấu ${discountPercent}%`} value={(subtotal * discountPercent) / 100} />
      <Row label={`Thuế ${taxPercent}%`} value={total - subtotal * (1 - discountPercent / 100)} />
      <div className="flex justify-between border-t border-border pt-1 font-medium">
        <span>Tổng</span>
        <span className="font-mono tabular-nums">{fmt(total)} {currency}</span>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-mono tabular-nums">{fmt(value)}</span>
    </div>
  );
}
