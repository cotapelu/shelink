/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ShieldCheck, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { triggerAuditCleanupNow } from "@/server/cron/manual-triggers";
import type { AuditListResult, AuditFilter } from "@/server/audit-list";
import { AuditFilters } from "./audit-filters";
import { AuditTable } from "./audit-table";

type Options = {
  actions: string[];
  targetTypes: string[];
  users: { id: string; name: string }[];
};

export function AuditView({
  result,
  options,
  currentFilter,
}: {
  result: AuditListResult;
  options: Options;
  currentFilter: AuditFilter;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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
      } catch (err) {
        toast.error("清理失败", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function navigate(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(sp.toString());
    next.delete("cursor");
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "" || v === "__all__") next.delete(k);
      else next.set(k, v);
    }
    router.push(`/audit?${next.toString()}`);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function nextPage() {
    if (!result.nextCursor) return;
    const next = new URLSearchParams(sp.toString());
    next.set("cursor", result.nextCursor);
    router.push(`/audit?${next.toString()}`);
  }

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5 text-primary" strokeWidth={1.8} />
            审计日志
          </h1>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            记录每个用户的关键操作。默认保留 365 天，每天 03:00 自动清理旧记录
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCleanup}
          disabled={cleaning}
          className="gap-1.5"
          title="立刻清理过期记录（不等到 03:00）"
        >
          {cleaning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          清理过期
        </Button>
      </header>

      <AuditFilters
        options={options}
        currentFilter={currentFilter}
        onNavigate={navigate}
      />

      <AuditTable
        result={result}
        expanded={expanded}
        onToggleExpand={toggleExpand}
        onNextPage={nextPage}
      />
    </div>
  );
}
