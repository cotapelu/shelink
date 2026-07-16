"use client";

import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface ArchiveToolbarProps {
  selectedSize: number;
  total: number;
  onClear: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export function ArchiveToolbar({ selectedSize, total, onClear, onApprove, onReject }: ArchiveToolbarProps) {
  return (
    <div className="mb-2 flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
      <span>已选 <span className="font-mono font-medium">{selectedSize}</span> / <span className="font-mono text-muted-foreground">{total}</span></span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onClear}>取消选择</Button>
        <Button size="sm" onClick={onApprove} className="bg-emerald-600 text-white hover:bg-emerald-700"><Check className="mr-1 h-3.5 w-3.5" />批量通过</Button>
        <Button size="sm" variant="destructive" onClick={onReject}><X className="mr-1 h-3.5 w-3.5" />批量驳回</Button>
      </div>
    </div>
  );
}
