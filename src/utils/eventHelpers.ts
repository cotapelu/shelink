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
import { Lunar, Solar } from "lunar-javascript";

export type EventType = "birthday" | "death_anniversary" | "custom_event";

export interface FamilyEvent {
  personId: string | null;
  personName: string;
  type: EventType;
  /** Solar date of the next occurrence */
  nextOccurrence: Date;
  /** Days until the next occurrence (negative = already passed this year, shown for context) */
  daysUntil: number;
  /** Display label for the date of the event (e.g., "12/03" solar or "05/02 ÂL") */
  eventDateLabel: string;
  /** The actual year of original event (birth year or death year) */
  originYear?: number | null;
  originMonth?: number | null;
  originDay?: number | null;
  /** Whether the person is deceased */
  isDeceased: boolean;
  /** Optional location for the event */
  location?: string | null;
  /** Optional content/description for the event */
  content?: string | null;
}

export interface CustomEventRecord {
  id: string;
  name: string;
  content: string | null;
  event_date: string;
  location: string | null;
  created_by: string | null;
}

export type PersonInput = {
  id: string;
  full_name: string;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  death_year: number | null;
  death_month: number | null;
  death_day: number | null;
  is_deceased: boolean;
};

/**
 * Finds the next solar Date on which a given lunar (month, day) falls,
 * starting from `fromDate`.
 */
function tryYearOffset(year: number, month: number, day: number, from: Date): Date | null {
  try {
    const LunarClass = Lunar as any;
    const l = LunarClass.fromYmd(year, month, day);
    const s = l.getSolar();
    const candidate = new Date(s.getYear(), s.getMonth() - 1, s.getDay());
    if (candidate >= from) return candidate;
  } catch {
    // ignore invalid dates
  }
  return null;
}

function nextSolarForLunar(
  lunarMonth: number,
  lunarDay: number,
  fromDate: Date,
): Date | null {
  const todaySolar = Solar.fromYmd(
    fromDate.getFullYear(),
    fromDate.getMonth() + 1,
    fromDate.getDate(),
  );
  const currentLunarYear = todaySolar.getLunar().getYear();

  for (let offset = 0; offset <= 2; offset++) {
    const result = tryYearOffset(currentLunarYear + offset, lunarMonth, lunarDay, fromDate);
    if (result) return result;
  }
  return null;
}

// ============ Helpers for computeEvents (refactor Cycle 3) ============

function computeDaysUntil(date: Date, today: Date): number {
  return Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function createBirthdayEvent(p: PersonInput, today: Date): FamilyEvent | null {
  if (!p.birth_month || !p.birth_day) return null;
  const thisYear = today.getFullYear();
  let next = new Date(thisYear, p.birth_month - 1, p.birth_day);
  if (next < today) next = new Date(thisYear + 1, p.birth_month - 1, p.birth_day);
  const daysUntil = computeDaysUntil(next, today);
  return {
    personId: p.id,
    personName: p.full_name,
    type: "birthday",
    nextOccurrence: next,
    daysUntil,
    eventDateLabel: `${p.birth_day.toString().padStart(2, "0")}/${p.birth_month.toString().padStart(2, "0")}`,
    originYear: p.birth_year || null,
    originMonth: p.birth_month,
    originDay: p.birth_day,
    isDeceased: p.is_deceased,
  };
}

function createDeathAnniversaryEvent(p: PersonInput, today: Date): FamilyEvent | null {
  if (!p.death_month || !p.death_day) return null;
  try {
    const deathYear = p.death_year ?? new Date().getFullYear();
    const solar = Solar.fromYmd(deathYear, p.death_month, p.death_day);
    const lunar = solar.getLunar();
    const lMonth = Math.abs(lunar.getMonth());
    const lDay = lunar.getDay();
    const next = nextSolarForLunar(lMonth, lDay, today);
    if (!next) return null;
    const daysUntil = computeDaysUntil(next, today);
    return {
      personId: p.id,
      personName: p.full_name,
      type: "death_anniversary",
      nextOccurrence: next,
      daysUntil,
      eventDateLabel: `${lDay.toString().padStart(2, "0")}/${lMonth.toString().padStart(2, "0")} ÂL`,
      originYear: p.death_year,
      isDeceased: p.is_deceased,
    };
  } catch {
    return null;
  }
}

function createCustomEvent(ce: CustomEventRecord, today: Date): FamilyEvent | null {
  if (!ce.event_date) return null;
  const [y, m, d] = ce.event_date.split("-").map(Number);
  if (!y || !m || !d) return null;
  const next = new Date(y, m - 1, d);
  const daysUntil = computeDaysUntil(next, today);
  return {
    personId: ce.id,
    personName: ce.name,
    type: "custom_event",
    nextOccurrence: next,
    daysUntil,
    eventDateLabel: `${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}/${y}`,
    originYear: y,
    isDeceased: false,
    location: ce.location,
    content: ce.content,
  };
}

/**
 * Computes upcoming FamilyEvents from a list of persons.
 * - Birthdays use the solar birth_month / birth_day.
 * - Death anniversaries (ngày giỗ) are observed on the *lunar* date of death.
 */
export function computeEvents(
  persons: PersonInput[],
  customEvents: CustomEventRecord[] = []
): FamilyEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const events: FamilyEvent[] = [];

  for (const p of persons) {
    const bday = createBirthdayEvent(p, today);
    if (bday) events.push(bday);
    const death = createDeathAnniversaryEvent(p, today);
    if (death) events.push(death);
  }

  for (const ce of customEvents) {
    const custom = createCustomEvent(ce, today);
    if (custom) events.push(custom);
  }

  // Sort: soonest first
  events.sort((a, b) => a.daysUntil - b.daysUntil);
  return events;
}
