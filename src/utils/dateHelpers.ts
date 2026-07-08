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
import { Solar } from "lunar-javascript";

/**
 * Formats a date (year, month, day) into a display string "dd/mm/yyyy".
 * If a component is missing, it is omitted. If all missing, returns "Chưa rõ".
 * @param year - Year (e.g., 2024) or null.
 * @param month - Month (1-12) or null.
 * @param day - Day (1-31) or null.
 * @returns Formatted date string.
 */
export function formatDisplayDate(
  year: number | null,
  month: number | null,
  day: number | null,
): string {
  if (!year && !month && !day) return "Chưa rõ";

  const parts = [];
  if (day) parts.push(day.toString().padStart(2, "0"));
  if (month) parts.push(month.toString().padStart(2, "0"));
  if (year) parts.push(year.toString());

  return parts.join("/");
}

/**
 * Converts a solar date to a Vietnamese lunar date string.
 * @param year - Solar year (e.g., 2024)
 * @param month - Solar month (1-12)
 * @param day - Solar day (1-31)
 * @returns Lunar date as "dd/mm/yyyy" or "dd/mm nhuận/yyyy", or null if input invalid.
 */
export function getLunarDateString(
  year: number | null,
  month: number | null,
  day: number | null,
): string | null {
  if (!year || !month || !day) return null;

  try {
    const solar = Solar.fromYmd(
      year,
      parseInt(month.toString()),
      parseInt(day.toString()),
    );
    const lunar = solar.getLunar();

    const lDay = lunar.getDay().toString().padStart(2, "0");
    const lMonthRaw = lunar.getMonth();
    const isLeap = lMonthRaw < 0;
    const lMonth = Math.abs(lMonthRaw).toString().padStart(2, "0");
    const lYear = lunar.getYear();

    return `${lDay}/${lMonth}${isLeap ? " nhuận" : ""}/${lYear}`;
  } catch (error) {
    console.error("Lunar conversion error:", error);
    return null;
  }
}

/**
 * Calculates age given birth year and optional death year.
 * @param birthYear - Birth year (e.g., 1990)
 * @param deathYear - Optional death year; if provided, calculates age at death.
 * @returns Object with age (number) and isDeceased (boolean), or null if birthYear missing.
 */
export function calculateAge(
  birthYear: number | null,
  deathYear?: number | null,
): { age: number; isDeceased: boolean } | null {
  if (!birthYear) return null;

  if (deathYear) {
    return { age: deathYear - birthYear, isDeceased: true };
  }

  return { age: new Date().getFullYear() - birthYear, isDeceased: false };
}

export function getZodiacSign(day: number | null, month: number | null): string | null {
  if (!day || !month) return null;
  const d = day;
  const m = month;

  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return "Bạch Dương";
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return "Kim Ngưu";
  if ((m === 5 && d >= 21) || (m === 6 && d <= 21)) return "Song Tử";
  if ((m === 6 && d >= 22) || (m === 7 && d <= 22)) return "Cự Giải";
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return "Sư Tử";
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return "Xử Nữ";
  if ((m === 9 && d >= 23) || (m === 10 && d <= 23)) return "Thiên Bình";
  if ((m === 10 && d >= 24) || (m === 11 && d <= 21)) return "Thiên Yết";
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return "Nhân Mã";
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return "Ma Kết";
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return "Bảo Bình";
  if ((m === 2 && d >= 19) || (m === 3 && d <= 20)) return "Song Ngư";

  return null;
}

export function getZodiacAnimal(year: number | null, month: number | null = null, day: number | null = null): string | null {
  if (!year) return null;
  const animals = [
    "Thân", "Dậu", "Tuất", "Hợi", "Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi"
  ];
  
  let targetYear = year;
  
  if (month && day) {
    try {
      const solar = Solar.fromYmd(year, parseInt(month.toString()), parseInt(day.toString()));
      targetYear = solar.getLunar().getYear();
    } catch (error) {
      console.error("Lunar conversion error in zodiac:", error);
    }
  }
  
  return animals[targetYear % 12];
}
