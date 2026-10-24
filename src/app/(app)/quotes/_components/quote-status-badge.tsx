"use client";

import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  SENT: "Đã gửi",
  ACCEPTED: "Khách đồng ý",
  REJECTED: "Từ chối",
  EXPIRED: "Hết hạn",
  CONVERTED: "Đã chuyển",
  CANCELLED: "Đã huỷ"
};

const VARIANTS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-500/15 text-blue-300",
  ACCEPTED: "bg-emerald-500/15 text-emerald-300",
  REJECTED: "bg-red-500/15 text-red-300",
  EXPIRED: "bg-orange-500/15 text-orange-300",
  CONVERTED: "bg-violet-500/15 text-violet-300",
  CANCELLED: "bg-muted text-muted-foreground"
};

export function QuoteStatusBadge({ status }: { status: string }) {
  return <Badge className={VARIANTS[status] ?? "bg-muted"}>{LABELS[status] ?? status}</Badge>;
}
