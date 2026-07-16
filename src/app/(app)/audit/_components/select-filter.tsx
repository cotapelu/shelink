"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL_VALUE = "__all__";

interface SelectFilterProps {
  label: string;
  value: string;
  options: string[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

export function SelectFilter({ label, value, options, onValueChange, placeholder = "全部", className = "", triggerClassName = "h-8 w-36 text-xs" }: SelectFilterProps) {
  return (
    <div className={className}>
      <label className="text-[10px] text-muted-foreground">{label}</label>
      <div className="mt-0.5">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className={triggerClassName}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{placeholder}</SelectItem>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
