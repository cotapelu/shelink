/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
"use client";

import { useDashboard } from "@/components/layout/DashboardContext";
import { EventIcon } from "./event-icon";
import { EventInfo } from "./event-info";
import { EventDaysBadge } from "./event-days-badge";
import { motion } from "framer-motion";
import { FamilyEvent } from "@/utils/eventHelpers";

interface EventCardProps {
  event: FamilyEvent;
  index: number;
  onEditCustomEvent: (e: FamilyEvent) => void;
}

export function EventCard({ event, index, onEditCustomEvent }: EventCardProps) {
  const isBirthday = event.type === "birthday";
  const isCustom = event.type === "custom_event";
  const isToday = event.daysUntil === 0;
  // const isSoon = event.daysUntil <= 7; // not used

  const { setMemberModalId } = useDashboard();

  const handleClick = () => {
    if (isCustom) {
      onEditCustomEvent(event);
    } else if (event.personId) {
      setMemberModalId(event.personId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      onClick={handleClick}
      className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md group ${
        isToday
          ? "bg-amber-50 border-amber-300 shadow-sm"
          : isBirthday
            ? "bg-white/80 border-stone-200/60 hover:border-blue-200"
            : isCustom
              ? "bg-white/80 border-stone-200/60 hover:border-purple-200"
              : "bg-white/80 border-stone-200/60 hover:border-rose-200"
      }`}
    >
      <EventIcon event={event} />
      <EventInfo event={event} />
      <EventDaysBadge event={event} />
    </motion.div>
  );
}
