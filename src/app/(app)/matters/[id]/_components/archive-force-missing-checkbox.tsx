"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ArchiveForceMissingCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  missingCount: number;
}

export function ArchiveForceMissingCheckbox({ checked, onChange, missingCount }: ArchiveForceMissingCheckboxProps) {
  return (
    <div className="flex items-center gap-2 rounded border border-amber-500/30 bg-amber-500/10 p-3">
      <Checkbox checked={checked} onCheckedChange={(c) => onChange(!!c)} id="force-missing" />
      <Label htmlFor="force-missing" className="text-sm text-foreground">
        Lưu trữ cưỡng chế (ghi lại hạng mục thiếu trong hồ sơ, còn {missingCount} tài liệu bắt buộc chưa tích)
      </Label>
    </div>
  );
}
