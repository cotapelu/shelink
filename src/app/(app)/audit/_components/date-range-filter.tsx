"use client";

import { Input } from "@/components/ui/input";

interface DateRangeFilterProps {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  className?: string;
}

export function DateRangeFilter({ label, value, onChange, className = "" }: DateRangeFilterProps) {
  return (
    <div className={className}>
      <label className="text-[10px] text-muted-foreground">{label}</label>
      <div className="mt-0.5">
        <Input
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-36 text-xs"
        />
      </div>
    </div>
  );
}
