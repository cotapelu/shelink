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
/**
 * Phân tích search params thành ReportPeriod, dùng chung cho page và export route.
 *
 * Nhận tham số:
 *   ?period=month|quarter|year|lastYear   định sẵn
 *   ?period=custom&start=yyyy-MM-dd&end=yyyy-MM-dd   tuỳ chọn
 *   Thiếu / không hợp lệ → year
 */
import { customPeriod, periodPresets, type ReportPeriod } from "./queries";

export type ResolvedPeriod = {
  period: ReportPeriod;
  /** Dùng để ghi lại URL */
  periodKey: "month" | "quarter" | "year" | "lastYear" | "custom";
  startStr?: string;
  endStr?: string;
  error?: string;
};

const VALID = ["month", "quarter", "year", "lastYear"] as const;

export function resolveReportPeriod(params: {
  period?: string;
  start?: string;
  end?: string;
}): ResolvedPeriod {
  const presets = periodPresets();

  if (params.period === "custom") {
    if (!params.start || !params.end) {
      return {
        period: presets.year,
        periodKey: "year",
        error: "Thiếu start / end, đã quay về năm nay"
      };
    }
    try {
      return {
        period: customPeriod(params.start, params.end),
        periodKey: "custom",
        startStr: params.start,
        endStr: params.end
      };
    } catch (err) {
      return {
        period: presets.year,
        periodKey: "year",
        error: err instanceof Error ? err.message : "Thời gian tuỳ chọn lỗi, đã quay về năm nay"
      };
    }
  }

  if (params.period && (VALID as readonly string[]).includes(params.period)) {
    const key = params.period as (typeof VALID)[number];
    return { period: presets[key], periodKey: key };
  }

  return { period: presets.year, periodKey: "year" };
}
