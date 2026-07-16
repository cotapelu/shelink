"use client";

import { AlertTriangle } from "lucide-react";
import type { ConflictSeverity } from "@prisma/client";

const severityStyle: Record<ConflictSeverity, { color: string; bg: string; label: string }> = {
  BLOCKING: { color: "#F87171", bg: "rgba(248,113,113,0.12)", label: "阻塞" },
  HIGH: { color: "#FB923C", bg: "rgba(251,146,60,0.12)", label: "高" },
  MEDIUM: { color: "#FBBF24", bg: "rgba(251,191,36,0.12)", label: "中" },
  LOW: { color: "#4ADE80", bg: "rgba(74,222,128,0.12)", label: "低" }
};

interface HitHeaderProps {
  severity: ConflictSeverity;
  hitType: string;
  reason: string;
  matchedField: string;
  matchedValue: string;
  matchedRatio: number | null;
}

export function HitHeader({ severity, hitType, reason, matchedField, matchedValue, matchedRatio }: HitHeaderProps) {
  const style = severityStyle[severity];
  return (
    <>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5" style={{ color: style.color }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: style.color }}>
          {style.label}
        </span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">
          {hitType === "HISTORICAL_CLIENT" ? "历史客户" : "历史案件"}
        </span>
      </div>
      <p className="mt-1.5 text-sm">{reason}</p>
      <div className="mt-1 font-mono text-[11px] text-muted-foreground">
        匹配字段：{matchedField} = {matchedValue}
        {matchedRatio !== null && matchedRatio < 1 && (
          <span className="ml-2">相似度 {(matchedRatio * 100).toFixed(0)}%</span>
        )}
      </div>
    </>
  );
}
