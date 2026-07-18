"use client";

import { FamilyEvent } from "@/utils/eventHelpers";
import { CalendarDays } from "lucide-react";
import { EventCard } from "./EventCard";

interface EventsGridProps {
  events: FamilyEvent[];
  onEditCustomEvent: (e: FamilyEvent) => void;
}

export function EventsGrid({ events, onEditCustomEvent }: EventsGridProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 text-stone-400">
        <CalendarDays className="size-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Không có sự kiện nào</p>
        <p className="text-sm mt-1">Hãy bổ sung ngày sinh hoặc ngày mất cho thành viên</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {events.map((event, i) => (
        <EventCard
          key={`${event.personId}-${event.type}-${event.eventDateLabel}`}
          event={event}
          index={i}
          onEditCustomEvent={onEditCustomEvent}
        />
      ))}
    </div>
  );
}
