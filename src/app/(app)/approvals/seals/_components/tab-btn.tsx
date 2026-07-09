"use client";
import { cn } from "@/lib/utils";
export function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("relative inline-flex items-center gap-1.5 pb-2.5 pt-1 text-[13px] transition-colors", active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
      {children}
      {active && <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-primary" />}
    </button>
  );
}
export function Count({ n, hot }: { n: number; hot?: boolean }) {
  if (n === 0) return null;
  return (
    <span className={cn("ml-1 inline-flex items-center justify-center rounded-full px-1.5 font-mono text-[10px]", hot ? "bg-amber-500/15 text-amber-700" : "bg-muted/60 text-muted-foreground")}>
      {n}
    </span>
  );
}
