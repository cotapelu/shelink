"use client";

import { MapPin } from "lucide-react";

const inputClasses = "w-full rounded-xl border border-stone-200/80 bg-white/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent transition-shadow";

interface EventLocationFieldProps {
  location: string;
  onChange: (v: string) => void;
}

export function EventLocationField({ location, onChange }: EventLocationFieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-stone-700 mb-1.5">
        Địa điểm
      </label>
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
        <input
          type="text"
          className={`${inputClasses} pl-11`}
          placeholder="VD: Khu lăng mộ dòng họ"
          value={location}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
