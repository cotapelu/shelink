"use client";

/** Stepper ngang vòng đời hợp đồng (UI-DESIGN §7.8). */
const STEPS = ["DRAFT", "REVIEW", "SIGNED", "ACTIVE"] as const;
const LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  REVIEW: "Review",
  SIGNED: "Đã ký",
  ACTIVE: "Hiệu lực"
};

export function ContractStatusStepper({ status, events }: { status: string; events: { kind: string; occurredAt: Date }[] }) {
  if (status === "TERMINATED" || status === "EXPIRED") {
    return (
      <p className="text-xs text-muted-foreground">
        Hợp đồng đã {status === "TERMINATED" ? "chấm dứt" : "hết hạn"} — xem lịch sử bên dưới.
      </p>
    );
  }
  const done = new Set(STEPS.slice(0, STEPS.indexOf(status as "DRAFT") + 1));
  const dateOf = (kind: string) => events.find((e) => e.kind === kind)?.occurredAt;

  return (
    <ol className="flex items-center gap-2 text-xs">
      {STEPS.map((step, i) => (
        <li key={step} className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 ${done.has(step) ? "bg-primary/15 text-foreground" : "bg-muted text-muted-foreground"}`}>
            {LABELS[step]}
          </span>
          {i < STEPS.length - 1 && <span className="text-muted-foreground">→</span>}
          {done.has(step) && dateOf(step) && (
            <span className="text-muted-foreground">{new Date(dateOf(step)!).toLocaleDateString("vi-VN")}</span>
          )}
        </li>
      ))}
    </ol>
  );
}
