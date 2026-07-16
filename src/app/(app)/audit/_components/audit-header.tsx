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
    if (!window.confirm("立刻清理超过保留期（默认 365 天，AUDIT_RETENTION_DAYS 环境变量可改）的审计记录？此操作不可撤销。")) {
      return;
    }
    startCleaning(async () => {
      try {
        const r = await triggerAuditCleanupNow();
        toast.success(`清理完成：保留 ${r.retentionDays} 天，删除 ${r.deleted} 条`);
        router.refresh();
        onCleaned?.();
      } catch (err) {
        toast.error("清理失败", {
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
          审计日志
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          系统操作记录 · 全部用户 · 不可删除
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={handleCleanup} disabled={cleaning} className="h-7 gap-1.5">
        {cleaning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        <Trash2 className="h-3.5 w-3.5" />
        清理过期
      </Button>
    </header>
  );
}
