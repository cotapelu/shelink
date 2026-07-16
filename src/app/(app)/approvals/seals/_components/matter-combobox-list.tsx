"use client";

import { Check } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { MatterOption } from "./matter-combobox";

interface MatterComboboxListProps {
  matters: MatterOption[];
  value: string;
  onSelect: (id: string) => void;
}

export function MatterComboboxList({ matters, value, onSelect }: MatterComboboxListProps) {
  return (
    <Command>
      <CommandInput placeholder="输入编号或案件名片段..." />
      <CommandList>
        <CommandEmpty>未找到匹配案件</CommandEmpty>
        <CommandGroup>
          {matters.map((m) => (
            <CommandItem
              key={m.id}
              value={`${m.internalCode} ${m.title}`}
              onSelect={() => onSelect(m.id)}
            >
              <Check
                className={cn(
                  "mr-2 h-3.5 w-3.5",
                  value === m.id ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="font-mono text-[11px] text-muted-foreground">
                {m.internalCode}
              </span>
              <span className="ml-2 truncate text-[13px]">{m.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
