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

import { CustomEventRecord, FamilyEvent } from "@/utils/eventHelpers";
import CustomEventModal from "@/components/domain/genealogy/events/CustomEventModal";
import { EventsSummary } from "./events-summary";
import { EventsToolbar } from "./events-toolbar";
import { EventsGrid } from "./events-grid";

interface EventsListViewProps {
  solarDate: string;
  lunarDate?: string;
  todayCount: number;
  soonCount: number;
  onAddEvent: () => void;
  filter: "all" | "birthday" | "death_anniversary" | "custom_event";
  setFilter: (f: "all" | "birthday" | "death_anniversary" | "custom_event") => void;
  showDeceasedBirthdays: boolean;
  setShowDeceasedBirthdays: (v: boolean) => void;
  totalCount: number;
  visibleEvents: FamilyEvent[];
  onEditCustomEvent: (e: FamilyEvent) => void;
  showCount: number;
  onLoadMore: () => void;
  isModalOpen: boolean;
  setIsModalOpen: (o: boolean) => void;
  editingCustomEvent: CustomEventRecord | null;
  onModalSuccess: () => void;
}

export function EventsListView(props: EventsListViewProps) {
  return (
    <div className="space-y-5">
      <EventsSummary
        solarDate={props.solarDate}
        lunarDate={props.lunarDate}
        todayCount={props.todayCount}
        soonCount={props.soonCount}
        onAddEvent={props.onAddEvent}
      />
      <EventsToolbar
        filter={props.filter}
        setFilter={props.setFilter}
        showDeceasedBirthdays={props.showDeceasedBirthdays}
        setShowDeceasedBirthdays={props.setShowDeceasedBirthdays}
        totalCount={props.totalCount}
      />
      <EventsGrid events={props.visibleEvents} onEditCustomEvent={props.onEditCustomEvent} />
      {props.visibleEvents.length < props.showCount && (
        <button
          onClick={props.onLoadMore}
          className="w-full py-3 text-sm font-semibold text-stone-500 hover:text-amber-600 transition-colors"
        >
          Xem thêm {props.visibleEvents.length} sự kiện…
        </button>
      )}
      <CustomEventModal
        isOpen={props.isModalOpen}
        onClose={() => props.setIsModalOpen(false)}
        onSuccess={props.onModalSuccess}
        eventToEdit={props.editingCustomEvent}
      />
    </div>
  );
}
