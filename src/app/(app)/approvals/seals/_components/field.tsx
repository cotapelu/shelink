"use client";

import { cn } from "@/lib/utils";

interface FieldProps {
  k: string;
  v: React.ReactNode;
  mono?: boolean;
}

export function Field({ k, v, mono }: FieldProps) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 text-muted-foreground">{k}:</span>
      <span className={cn("min-w-0", mono ? "font-mono text-[11px]" : "")}>
        {v}
      </span>
    </div>
  );
}
