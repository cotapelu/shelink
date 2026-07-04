// @ts-nocheck
"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CauseComboboxProps {
  category: string;
  value: string;
  onChange: (id: string, name: string) => void;
}

export function CauseCombobox({ category, value, onChange }: CauseComboboxProps) {
  const [open, setOpen] = useState(false);
  return (
    <Select open={open} onOpenChange={setOpen} value={value} onValueChange={(v) => onChange(v, "Cause " + v)}>
      <SelectTrigger>
        <SelectValue placeholder="Select cause" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="c1">Cause 1</SelectItem>
        <SelectItem value="c2">Cause 2</SelectItem>
      </SelectContent>
    </Select>
  );
}