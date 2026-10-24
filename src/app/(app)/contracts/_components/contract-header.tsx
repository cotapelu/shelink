import Link from "next/link";
import { ContractStatusBadge } from "./contract-status-badge";

/** Header chi tiết hợp đồng: mã + trạng thái + liên kết (UI-DESIGN §7.8). */
export function ContractHeader({
  title,
  code,
  status,
  expiresAt,
  renewRemindDays,
  clientId,
  clientName,
  quote
}: {
  title: string;
  code: string;
  status: string;
  expiresAt: Date | null;
  renewRemindDays: number;
  clientId: string;
  clientName: string;
  quote: { id: string; code: string } | null;
}) {
  const active = status === "ACTIVE" || status === "RENEWED";
  const renewNear =
    active && expiresAt != null && new Date(expiresAt).getTime() - Date.now() < renewRemindDays * 86400000;

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-medium">{title}</h1>
        <ContractStatusBadge status={status} />
        {renewNear && <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">Sắp hết hạn</span>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="font-mono">{code}</span> · Khách hàng:{" "}
        <Link href={`/clients/${clientId}`} className="hover:underline">{clientName}</Link>
        {quote && (
          <> · Từ báo giá <Link href={`/quotes/${quote.id}`} className="hover:underline">{quote.code}</Link></>
        )}
      </p>
    </div>
  );
}
