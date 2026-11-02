"use client";

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
      <Label className="text-[11px]">Vụ án liên kết (tuỳ chọn)</Label>
      <div className="mt-1">
        {preset?.matterId ? (
          <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 text-[12px]">
            <span className="text-[10px] text-muted-foreground">Đã liên kết</span>
            <span className="truncate">
              {matters.find((m) => m.id === preset.matterId)?.title ?? "Vụ án hiện tại"}
            </span>
          </div>
        ) : (
          <MatterCombobox
            matters={matters}
            value={matterId}
            onChange={setMatterId}
            placeholder="Không liên kết vụ án"
          />
        )}
      </div>
    </div>
  );
}
