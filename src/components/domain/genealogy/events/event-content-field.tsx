"use client";

import { AlignLeft } from "lucide-react";

interface EventContentFieldProps {
  content: string;
  onChange: (v: string) => void;
}

export function EventContentField({ content, onChange }: EventContentFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">Mô tả (tùy chọn)</label>
      <div className="relative">
        <AlignLeft className="absolute left-3 top-3 size-4 text-muted-foreground" />
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 min-h-[80px]"
          placeholder="Nhập mô tả"
        />
      </div>
    </div>
  );
}
