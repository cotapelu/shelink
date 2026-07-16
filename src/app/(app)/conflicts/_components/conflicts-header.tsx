"use client";

import { ShieldCheck } from "lucide-react";

export function ConflictsHeader() {
  return (
    <header>
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <ShieldCheck className="h-5 w-5 text-primary" />
        利益冲突检索
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        快速查 — 比对历史客户与案件，确认是否存在代理冲突
      </p>
    </header>
  );
}
