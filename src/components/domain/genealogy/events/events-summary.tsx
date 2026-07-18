"use client";

import { CalendarDays, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface EventsSummaryProps {
  solarDate: string;
  lunarDate?: string;
  todayCount: number;
  soonCount: number;
  onAddEvent: () => void;
}

export function EventsSummary({ solarDate, lunarDate, todayCount, soonCount, onAddEvent }: EventsSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <CalendarDays className="size-5 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-900 leading-tight">
            Hôm nay: {solarDate}
            {lunarDate && <span className="font-normal text-amber-700 ml-1">({lunarDate})</span>}
          </p>
        </div>
        {(todayCount > 0 || soonCount > 0) && (
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xl shrink-0 leading-none">🎊</span>
            <p className="text-sm font-medium text-amber-800 leading-tight">
              {todayCount > 0 && <span className="font-bold">{todayCount} sự kiện hôm nay</span>}
              {todayCount > 0 && soonCount > 0 && " · "}
              {soonCount > 0 && <span>{soonCount} sự kiện trong 7 ngày tới</span>}
            </p>
          </div>
        )}
      </div>
      <button
        onClick={onAddEvent}
        className="shrink-0 self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-semibold text-sm shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
      >
        <Plus className="size-4" />
        <span>Thêm sự kiện</span>
      </button>
    </motion.div>
  );
}
