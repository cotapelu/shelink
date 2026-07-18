"use client";

import { MapPin } from "lucide-react";

interface EventLocationFieldProps {
  location: string;
  onChange: (v: string) => void;
}

export function EventLocationField({ location, onChange }: EventLocationFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">Địa điểm (tùy chọn)</label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={location}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2"
          placeholder="Nhập địa điểm"
        />
      </div>
    </div>
  );
}
