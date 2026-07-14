"use client";

import { Link2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { MatterCombobox } from "./matter-combobox";
import type { MatterOption } from "./seal-types";

interface MatterLinkSectionProps {
  preset: { draftDocId?: string; matterId?: string; documentTitle?: string } | null;
  matters: MatterOption[];
  matterId: string;
  setMatterId: (id: string) => void;
}

export function MatterLinkSection({
  preset,
  matters,
  matterId,
  setMatterId
}: MatterLinkSectionProps) {
  return (
    <div>
      <Label className="text-[11px]">关联案件 (可选)</Label>
      <div className="mt-1">
        {preset?.matterId ? (
          <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 text-[12px]">
            <span className="text-[10px] text-muted-foreground">已关联</span>
            <span className="truncate">
              {matters.find((m) => m.id === preset.matterId)?.title ?? "当前案件"}
            </span>
          </div>
        ) : (
          <MatterCombobox
            matters={matters}
            value={matterId}
            onChange={setMatterId}
            placeholder="不关联案件"
          />
        )}
      </div>
    </div>
  );
}
