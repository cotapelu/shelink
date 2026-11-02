"use client";

import { Button } from "@/components/ui/button";
import { ShieldCheck, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { triggerAuditCleanupNow } from "@/server/cron/manual-triggers";

interface AuditHeaderProps {
  onCleaned?: () => void;
}

export function AuditHeader({ onCleaned }: AuditHeaderProps) {
  const router = useRouter();
  const [cleaning, startCleaning] = useTransition();

  function handleCleanup() {
    if (!window.confirm("Dọn ngay các bản ghi audit quá thời hạn lưu (mặc định 365 ngày, biến môi trường AUDIT_RETENTION_DAYS có thể đổi)? Thao tác này không hoàn tác được.")) {
      return;
    }
    startCleaning(async () => {
      try {
        const r = await triggerAuditCleanupNow();
        toast.success(`Dọn xong: giữ ${r.retentionDays} ngày, đã xoá ${r.deleted} mục`);
        router.refresh();
        onCleaned?.();
      } catch (err) {
        toast.error("Dọn dẹp thất bại", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <header className="flex items-end justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-xl">
          <ShieldCheck className="h-5 w-5 text-primary" strokeWidth={1.8} />
          Log audit
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Bản ghi thao tác hệ thống · mọi người dùng · không xoá được
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={handleCleanup} disabled={cleaning} className="h-7 gap-1.5">
        {cleaning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        <Trash2 className="h-3.5 w-3.5" />
        Dọn bản quá hạn
      </Button>
    </header>
  );
}
