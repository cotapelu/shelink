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

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeEvents, FamilyEvent, CustomEventRecord } from "@/utils/eventHelpers";
import { Solar } from "lunar-javascript";
import { EventsListView } from "./events-list-view";

interface EventsListProps {
  persons: { id: string; full_name: string; birth_year: number | null; birth_month: number | null; birth_day: number | null; death_year: number | null; death_month: number | null; death_day: number | null; is_deceased: boolean }[];
  customEvents?: CustomEventRecord[];
}

export default function EventsList({ persons, customEvents = [] }: EventsListProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "birthday" | "death_anniversary" | "custom_event">("all");
  const [showCount, setShowCount] = useState(20);
  const [showDeceasedBirthdays, setShowDeceasedBirthdays] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomEvent, setEditingCustomEvent] = useState<CustomEventRecord | null>(null);

  const handleOpenEditModal = (event: FamilyEvent) => {
    const rawEvent = customEvents.find(ce => ce.id === event.personId);
    if (rawEvent) { setEditingCustomEvent(rawEvent); setIsModalOpen(true); }
  };
  const handleOpenCreateModal = () => { setEditingCustomEvent(null); setIsModalOpen(true); };
  const handleModalSuccess = () => { router.refresh(); };

  const todayDate = useMemo(() => {
    const today = new Date(); const solar = `Ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`; let lunar = "";
    try { const solarObj = Solar.fromYmd(today.getFullYear(), today.getMonth() + 1, today.getDate()); const lunarObj = solarObj.getLunar(); const lMonthRaw = lunarObj.getMonth(); const isLeap = lMonthRaw < 0; const lMonth = Math.abs(lMonthRaw).toString().padStart(2, '0'); const lDay = lunarObj.getDay().toString().padStart(2, '0'); lunar = `${lDay}/${lMonth}${isLeap ? " nhuận" : ""} ÂL`; } catch (e) { console.error(e); }
    return { solar, lunar };
  }, []);
  const allEvents = useMemo(() => computeEvents(persons, customEvents), [persons, customEvents]);
  const filtered = useMemo(() => {
    let result = allEvents; if (filter !== "all") result = result.filter(e => e.type === filter); if (!showDeceasedBirthdays) result = result.filter(e => !(e.type === "birthday" && e.isDeceased)); return result;
  }, [allEvents, filter, showDeceasedBirthdays]);
  const upcoming = filtered.filter(e => e.daysUntil <= 365);
  const visible = upcoming.slice(0, showCount);
  const todayCount = allEvents.filter(e => e.daysUntil === 0).length;
  const soonCount = allEvents.filter(e => e.daysUntil > 0 && e.daysUntil <= 7).length;

  return (
    <EventsListView
      solarDate={todayDate.solar} lunarDate={todayDate.lunar} todayCount={todayCount} soonCount={soonCount} onAddEvent={handleOpenCreateModal}
      filter={filter} setFilter={setFilter} showDeceasedBirthdays={showDeceasedBirthdays} setShowDeceasedBirthdays={setShowDeceasedBirthdays}
      totalCount={filtered.length} visibleEvents={visible} onEditCustomEvent={handleOpenEditModal} showCount={showCount}
      onLoadMore={() => setShowCount(n => n + 20)} isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen}
      editingCustomEvent={editingCustomEvent} onModalSuccess={handleModalSuccess}
    />
  );
}
