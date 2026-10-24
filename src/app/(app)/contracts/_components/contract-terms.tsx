"use client";

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 0 });
const d = (v: Date | null) => (v ? new Date(v).toLocaleDateString("vi-VN") : "—");

/** Giá trị, ngày ký, hiệu lực + phạm vi & điều kiện thanh toán. */
export function ContractTerms({
  amount,
  currency,
  signedAt,
  expiresAt,
  scope,
  paymentTerms
}: {
  amount: number;
  currency: string;
  signedAt: Date | null;
  expiresAt: Date | null;
  scope: string | null;
  paymentTerms: string | null;
}) {
  return (
    <>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Giá trị</p>
          <p className="mt-1 font-mono tabular-nums">{fmt(amount)} {currency}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Ngày ký</p>
          <p className="mt-1 font-mono tabular-nums">{d(signedAt)}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Hiệu lực đến</p>
          <p className="mt-1 font-mono tabular-nums">{d(expiresAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <section className="rounded-lg border border-border p-4">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Phạm vi công việc</h2>
          <p className="whitespace-pre-line">{scope ?? "—"}</p>
        </section>
        <section className="rounded-lg border border-border p-4">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Điều kiện thanh toán</h2>
          <p className="whitespace-pre-line">{paymentTerms ?? "—"}</p>
        </section>
      </div>
    </>
  );
}
