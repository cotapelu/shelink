import type { LeaveBalance } from "@/server/leave/balance";

/** Thẻ tóm tắt số dư phép năm hiện tại. */
export function LeaveBalanceCard({ balance }: { balance: LeaveBalance }) {
  const cards = [
    { label: `Ngưỡng năm ${balance.year}`, value: `${balance.settings.annualEntitlementDays}d` },
    { label: "Tồn đầu kỳ", value: `${balance.settings.carryOverDays}d` },
    { label: "Đã dùng (duyệt/chờ)", value: `${balance.usedDays}d` },
    { label: "Còn lại", value: `${balance.remainingDays}d` }
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c, i) => (
        <div
          key={c.label}
          className={"rounded-xl border border-border bg-card p-4 " + (i === 3 ? "border-primary/40" : "")}
        >
          <p className="text-[11px] text-muted-foreground">{c.label}</p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
