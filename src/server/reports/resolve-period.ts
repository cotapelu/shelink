/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/**
 * 把 search params 解析成 ReportPeriod，被 page 和 export route 共用。
 *
 * 接受参数：
 *   ?period=month|quarter|year|lastYear   预设
 *   ?period=custom&start=yyyy-MM-dd&end=yyyy-MM-dd   自定义
 *   缺省 / 非法 → year
 */
import { customPeriod, periodPresets, type ReportPeriod } from "./queries";

export type ResolvedPeriod = {
  period: ReportPeriod;
  /** 用于回写 URL */
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
        error: "缺少 start / end，已回退本年"
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
        error: err instanceof Error ? err.message : "自定义时间错误，已回退本年"
      };
    }
  }

  if (params.period && (VALID as readonly string[]).includes(params.period)) {
    const key = params.period as (typeof VALID)[number];
    return { period: presets[key], periodKey: key };
  }

  return { period: presets.year, periodKey: "year" };
}
