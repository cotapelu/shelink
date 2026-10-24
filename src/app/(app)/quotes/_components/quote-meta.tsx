"use client";

/** Thông tin meta báo giá + nút in (cửa sổ in ẩn shell qua print:hidden). */
export function QuoteMeta({
  issuedAt,
  expiresAt,
  note
}: {
  issuedAt: Date | null;
  expiresAt: Date | null;
  note: string | null;
}) {
  const d = (v: Date | null) => (v ? new Date(v).toLocaleDateString("vi-VN") : "—");

  return (
    <>
      <dl className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
        <div><dt>Ngày gửi</dt><dd className="text-foreground">{d(issuedAt)}</dd></div>
        <div><dt>Hiệu lực đến</dt><dd className="text-foreground">{d(expiresAt)}</dd></div>
        <div><dt>Ghi chú</dt><dd className="text-foreground">{note ?? "—"}</dd></div>
      </dl>

      <button
        onClick={() => window.print()}
        className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground print:hidden"
      >
        In / Xuất PDF
      </button>
    </>
  );
}
