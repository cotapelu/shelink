"use client";

const KIND_LABELS: Record<string, string> = {
  CREATED: "Tạo",
  SENT: "Gửi",
  SIGNED: "Ký",
  ACTIVATED: "Kích hoạt",
  RENEWED: "Gia hạn",
  TERMINATED: "Chấm dứt",
  EXPIRED: "Hết hạn",
  NOTE: "Ghi chú"
};

export interface ContractEventRow {
  id: string;
  kind: string;
  detail: string | null;
  occurredAt: Date;
  actorName: string | null;
}

/** Chuỗi sự kiện bất biến của hợp đồng (DATA-MODEL §4.29). */
export function ContractEvents({ events }: { events: ContractEventRow[] }) {
  return (
    <section className="rounded-lg border border-border p-4">
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Lịch sử</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có sự kiện.</p>
      ) : (
        <ol className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 rounded bg-muted px-2 py-0.5 text-xs">{KIND_LABELS[e.kind] ?? e.kind}</span>
              <span className="text-muted-foreground">{new Date(e.occurredAt).toLocaleString("vi-VN")}</span>
              <span className="flex-1">{e.detail ?? ""}</span>
              {e.actorName && <span className="text-xs text-muted-foreground">{e.actorName}</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
