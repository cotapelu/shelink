"use client";

import { AlignLeft } from "lucide-react";

const inputClasses = "w-full rounded-xl border border-stone-200/80 bg-white/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent transition-shadow";

interface EventContentFieldProps {
  content: string;
  onChange: (v: string) => void;
}

export function EventContentField({ content, onChange }: EventContentFieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-stone-700 mb-1.5">
        Mô tả (tùy chọn)
      </label>
      <div className="relative">
        <AlignLeft className="absolute left-4 top-3 size-4 text-stone-400" />
        <textarea
          className={`${inputClasses} pl-11 min-h-[100px]`}
          placeholder="Mô tả chi tiết về sự kiện..."
          value={content}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
