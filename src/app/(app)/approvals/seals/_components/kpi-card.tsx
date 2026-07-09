"use client";
import type { ReactNode } from "react";
export function KpiCard({ icon, label, value, accent }: { icon: ReactNode; label: string; value: number; accent: string }) {
  return (
    <div className="ll-surface rounded-lg p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span style={{ color: accent }}>{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-3xl" style={{ color: accent }}>{value}</p>
    </div>
  );
}
