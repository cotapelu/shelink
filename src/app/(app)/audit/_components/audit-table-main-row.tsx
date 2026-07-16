"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown } from "lucide-react";

interface AuditTableMainRowProps {
  entry: any;
  isOpen: boolean;
  onToggleExpand: (id: string) => void;
}

export function AuditTableMainRow({ entry, isOpen, onToggleExpand }: AuditTableMainRowProps) {
  return (
    <tr className={cn("hover:bg-muted/20", isOpen && "bg-muted/20")}>
      <td className="px-2 py-1.5 text-center">
        <button
          type="button"
          onClick={() => onToggleExpand(entry.id)}
          className="text-muted-foreground hover:text-foreground"
        >
          {isOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
      </td>
      <td className="px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
        {entry.createdAt.toLocaleString("zh-CN")}
      </td>
      <td className="px-2 py-1.5">{entry.user?.name ?? "—"}</td>
      <td className="px-2 py-1.5 font-mono text-foreground">{entry.action}</td>
      <td className="px-2 py-1.5 text-muted-foreground">{entry.targetType ?? "—"}</td>
      <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
        {entry.targetId
          ? entry.targetId.length > 18
            ? `${entry.targetId.slice(0, 8)}…${entry.targetId.slice(-6)}`
            : entry.targetId
          : "—"}
      </td>
      <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
        {entry.ip ?? "—"}
      </td>
    </tr>
  );
}
