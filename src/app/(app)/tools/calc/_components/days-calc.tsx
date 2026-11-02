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

import { useState } from "react";
import { CalendarDays, ArrowRight, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioChips } from "@/components/ui/radio-chips";
import { daysBetween, addDays } from "@/lib/legal-calc";

function fmtDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Mode = "between" | "add";

export function DaysCalc() {
  const [mode, setMode] = useState<Mode>("between");

  // Chế độ 1: giữa hai ngày
  const today = new Date();
  const [dateA, setDateA] = useState(fmtDate(today));
  const [dateB, setDateB] = useState(fmtDate(today));
  const [excludeWeekend, setExcludeWeekend] = useState(false);

  const [between, setBetween] = useState<number | null>(null);
  function computeBetween() {
    const a = new Date(dateA);
    const b = new Date(dateB);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) {
      setBetween(null);
      return;
    }
    setBetween(daysBetween(a, b, excludeWeekend));
  }

  // Chế độ 2: cộng/trừ số ngày
  const [baseDate, setBaseDate] = useState(fmtDate(today));
  const [offset, setOffset] = useState("15");
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  function computeTarget() {
    const base = new Date(baseDate);
    const n = parseInt(offset);
    if (isNaN(base.getTime()) || isNaN(n)) {
      setTargetDate(null);
      return;
    }
    setTargetDate(addDays(base, n));
  }

  return (
    <section className="ll-surface rounded-lg border border-border p-5">
      <header className="mb-4 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary" strokeWidth={1.8} />
        <h2 className="text-lg">Tính số ngày</h2>
        <span className="ml-2 text-[10px] text-muted-foreground">
          Thường dùng cho thời hạn chứng minh / thời hiệu kháng cáo / thời hạn trả lời
        </span>
      </header>

      <RadioChips
        size="sm"
        items={[
          { value: "between", label: "Giữa hai ngày" },
          { value: "add", label: "Cộng/trừ ngày" }
        ]}
        value={mode}
        onChange={(v) => setMode(v as Mode)}
      />

      {mode === "between" ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-[11px]">Ngày bắt đầu</Label>
              <Input
                type="date"
                value={dateA}
                onChange={(e) => setDateA(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px]">Ngày kết thúc</Label>
              <Input
                type="date"
                value={dateB}
                onChange={(e) => setDateB(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Checkbox
                checked={excludeWeekend}
                onCheckedChange={(v) => setExcludeWeekend(v === true)}
              />
              Chỉ tính ngày làm việc (loại cuối tuần, không gồm ngày lễ theo luật định)
            </label>
            <Button onClick={computeBetween} className="h-9 gap-1.5">
              <Calculator className="h-3.5 w-3.5" />
              Tính
            </Button>
          </div>

          {between !== null && (
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="text-[10px] tracking-wider text-muted-foreground">Số ngày cách</div>
              <div className="mt-1 font-mono text-[26px] font-medium tabular text-primary">
                {between >= 0 ? between : `-${Math.abs(between)}`} ngày
              </div>
              {between < 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">Ngày kết thúc trước ngày bắt đầu</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-[11px]">Ngày gốc</Label>
              <Input
                type="date"
                value={baseDate}
                onChange={(e) => setBaseDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px]">Cộng/trừ ngày (được âm)</Label>
              <Input
                type="number"
                value={offset}
                onChange={(e) => setOffset(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={computeTarget} className="h-9 gap-1.5">
              <Calculator className="h-3.5 w-3.5" />
              Tính
            </Button>
          </div>

          {targetDate && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-4">
              <div className="text-center">
                <div className="text-[10px] tracking-wider text-muted-foreground">Ngày gốc</div>
                <div className="mt-1 font-mono text-[14px] tabular text-foreground">
                  {baseDate}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-center">
                <div className="text-[10px] tracking-wider text-muted-foreground">
                  Ngày đích ({parseInt(offset) >= 0 ? "+" : ""}{offset} ngày)
                </div>
                <div className="mt-1 font-mono text-[20px] font-medium tabular text-primary">
                  {fmtDate(targetDate)}
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][targetDate.getDay()]}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
