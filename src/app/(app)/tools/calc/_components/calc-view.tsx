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
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Scale, Coins, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { CourtFeeCalc } from "./court-fee-calc";
import { LateInterestCalc } from "./late-interest-calc";
import { DaysCalc } from "./days-calc";

type Tab = "courtFee" | "lateInterest" | "days";

const TABS: { key: Tab; label: string; icon: typeof Scale }[] = [
  { key: "courtFee", label: "诉讼费", icon: Scale },
  { key: "lateInterest", label: "迟延履行金", icon: Coins },
  { key: "days", label: "天数计算", icon: CalendarDays }
];

export function CalcView({ hideHeader }: { hideHeader?: boolean } = {}) {
  const [tab, setTab] = useState<Tab>("courtFee");

  return (
    <div className="space-y-5">
      {/* 标题（应用页内嵌时由 tab 标注，隐藏）*/}
      {!hideHeader && (
        <div>
          <h1 className="flex items-center gap-2 text-2xl">
            <Calculator className="h-5 w-5 text-primary" strokeWidth={1.6} />
            实务工具
          </h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            诉讼费 / 迟延履行金 / 天数 —— 纯前端速算，无需联网
          </p>
        </div>
      )}

      {/* Tab */}
      <div className="border-b border-border">
        <div className="flex gap-5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative inline-flex items-center gap-1.5 pb-2.5 pt-1 text-[13px] transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                {t.label}
                {active && (
                  <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-3xl"
      >
        {tab === "courtFee" && <CourtFeeCalc />}
        {tab === "lateInterest" && <LateInterestCalc />}
        {tab === "days" && <DaysCalc />}
      </motion.div>
    </div>
  );
}
