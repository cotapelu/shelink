"use client";

import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  REVIEW: "Review",
  SIGNED: "Đã ký",
  ACTIVE: "Hiệu lực",
  EXPIRED: "Hết hạn",
  TERMINATED: "Chấm dứt",
  RENEWED: "Gia hạn"
};

const VARIANTS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  REVIEW: "bg-amber-500/15 text-amber-300",
  SIGNED: "bg-blue-500/15 text-blue-300",
  ACTIVE: "bg-emerald-500/15 text-emerald-300",
  EXPIRED: "bg-orange-500/15 text-orange-300",
  TERMINATED: "bg-red-500/15 text-red-300",
  RENEWED: "bg-violet-500/15 text-violet-300"
};

export function ContractStatusBadge({ status }: { status: string }) {
  return <Badge className={VARIANTS[status] ?? "bg-muted"}>{LABELS[status] ?? status}</Badge>;
}
