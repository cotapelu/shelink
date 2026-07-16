"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MatterOption } from "./matter-combobox";

interface MatterComboboxTriggerProps {
  selected: MatterOption | null;
  placeholder: string;
  onClear?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onKeyClear?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}

export function MatterComboboxTrigger({
  selected,
  placeholder,
  onClear,
  onKeyClear
}: MatterComboboxTriggerProps) {
  return (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={false} // controlled by parent
      className="w-full justify-between font-normal"
    >
      {selected ? (
        <span className="flex flex-1 items-center gap-2 truncate">
          <span className="font-mono text-[11px] text-muted-foreground">
            {selected.internalCode}
          </span>
          <span className="truncate">{selected.title}</span>
        </span>
      ) : (
        <span className="text-muted-foreground">{placeholder}</span>
      )}
      <div className="flex items-center gap-1">
        {selected && (
          <span
            role="button"
            tabIndex={0}
            aria-label="清空"
            onClick={onClear}
            onKeyDown={onKeyClear}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </div>
    </Button>
  );
}
