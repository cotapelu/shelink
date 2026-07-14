"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface SealsHeaderProps {
  onNewClick: () => void;
}

export function SealsHeader({ onNewClick }: SealsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl">审批 · 用章</h1>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          未来可扩展文书内审等其他审批类型
        </p>
      </div>
      <Button onClick={onNewClick} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        新建用章申请
      </Button>
    </div>
  );
}
