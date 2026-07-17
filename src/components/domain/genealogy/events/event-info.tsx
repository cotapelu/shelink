"use client";

import { CalendarDays, MapPin, AlignLeft } from "lucide-react";
import { FamilyEvent } from "@/utils/eventHelpers";
import { getZodiacSign } from "@/utils/dateHelpers";

interface EventInfoProps {
  event: FamilyEvent;
}

export function EventInfo({ event }: EventInfoProps) {
  const isBirthday = event.type === "birthday";
  const isCustom = event.type === "custom_event";

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p
          className={`font-semibold text-stone-800 truncate transition-colors group-hover:text-amber-700`}
        >
          {event.personName}
        </p>
        {isBirthday && event.originDay && event.originMonth && getZodiacSign(event.originDay, event.originMonth) && (
          <span className="shrink-0 text-[10px] font-sans font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 rounded-md px-1.5 py-0.5 whitespace-nowrap shadow-xs tracking-wider">
            {getZodiacSign(event.originDay, event.originMonth)}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 mt-1">
        <p className="text-sm text-stone-500 flex items-center gap-1.5 leading-tight">
          <CalendarDays className="size-3.5 shrink-0" />
          {isBirthday ? "Sinh nhật" : isCustom ? "Sự kiện" : "Ngày giỗ"} —{" "}
          <span className="font-medium text-stone-600">
            {event.eventDateLabel}
          </span>
          {event.originYear && (
            <span className="text-stone-400">({event.originYear})</span>
          )}
        </p>
        {event.location && (
          <p className="text-sm text-stone-500 flex items-center gap-1.5 leading-tight">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{event.location}</span>
          </p>
        )}
        {event.content && (
          <p className="text-sm text-stone-500 flex items-start gap-1.5 leading-tight mt-0.5">
            <AlignLeft className="size-3.5 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{event.content}</span>
          </p>
        )}
      </div>
    </div>
  );
}
