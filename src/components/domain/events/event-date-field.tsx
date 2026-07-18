"use client";

import { Calendar as CalendarIcon } from "lucide-react";

const inputClasses = "w-full rounded-xl border border-stone-200/80 bg-white/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent transition-shadow";

interface EventDateFieldProps {
  eventDate: string;
  onChange: (v: string) => void;
}

export function EventDateField({ eventDate, onChange }: EventDateFieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-stone-700 mb-1.5">
        Ngày diễn ra (Dương lịch) <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
        <input
          required
          type="date"
          className={`${inputClasses} pl-11`}
          value={eventDate}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
