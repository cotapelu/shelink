"use client";

import { Calendar as CalendarIcon } from "lucide-react";

interface EventDateFieldProps {
  eventDate: string;
  onChange: (v: string) => void;
}

export function EventDateField({ eventDate, onChange }: EventDateFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">Ngày</label>
      <div className="relative">
        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="date"
          value={eventDate}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2"
          required
        />
      </div>
    </div>
  );
}
