"use client";

import { Cake, Flower, Star } from "lucide-react";
import { FamilyEvent } from "@/utils/eventHelpers";

interface EventIconProps {
  event: FamilyEvent;
}

export function EventIcon({ event }: EventIconProps) {
  const isBirthday = event.type === "birthday";
  const isCustom = event.type === "custom_event";
  const isToday = event.daysUntil === 0;

  return (
    <div
      className={`shrink-0 size-11 flex items-center justify-center rounded-xl mt-0.5 ${
        isToday
          ? "bg-amber-100 text-amber-600"
          : isBirthday
            ? "bg-blue-50 text-blue-500"
            : isCustom
              ? "bg-purple-50 text-purple-500"
              : "bg-rose-50 text-rose-500"
      }`}
    >
      {isBirthday ? (
        <Cake className="size-5" />
      ) : isCustom ? (
        <Star className="size-5" />
      ) : (
        <Flower className="size-5" />
      )}
    </div>
  );
}
