"use client";

import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

interface AuditPaginationProps {
  result: { items: any[]; nextCursor?: string | null };
}

export function AuditPagination({ result }: AuditPaginationProps) {
  const router = useRouter();
  const sp = useSearchParams();

  function nextPage() {
    if (!result.nextCursor) return;
    const next = new URLSearchParams(sp.toString());
    next.set("cursor", result.nextCursor);
    router.push(`/audit?${next.toString()}`);
  }

  return (
    <div className="flex items-end justify-between text-xs text-muted-foreground mt-3">
      <span>本页 {result.items.length} 条</span>
      {result.nextCursor && (
        <Button size="sm" variant="outline" onClick={nextPage}>
          下一页 →
        </Button>
      )}
    </div>
  );
}
