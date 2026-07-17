"use client";

import { Clock } from "lucide-react";
import { FamilyEvent } from "@/utils/eventHelpers";

interface EventDaysBadgeProps {
  event: FamilyEvent;
}

const DAY_LABELS: Record<number, string> = {
  0: "Hôm nay",
  1: "Ngày mai",
};

function daysUntilLabel(days: number): string {
  if (days in DAY_LABELS) return DAY_LABELS[days];
  if (days <= 30) return `${days} ngày nữa`;
  if (days <= 60) return `${Math.ceil(days / 7)} tuần nữa`;
  return `${Math.ceil(days / 30)} tháng nữa`;
}

export function EventDaysBadge({ event }: EventDaysBadgeProps) {
  const isToday = event.daysUntil === 0;
  const isSoon = event.daysUntil <= 7;

  return (
    <div
      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
        isToday
          ? "bg-amber-400 text-white"
          : isSoon
            ? "bg-red-100 text-red-600"
            : "bg-stone-100 text-stone-500"
      }`}
    >
      <Clock className="size-3" />
      {daysUntilLabel(event.daysUntil)}
    </div>
  );
}
