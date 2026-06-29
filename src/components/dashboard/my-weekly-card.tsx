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
import { Briefcase, CheckCircle2, Archive, Wallet } from "lucide-react";
import type { LawyerWeeklyDigest } from "@/server/reports/weekly";

export function MyWeeklyCard({ digest }: { digest: LawyerWeeklyDigest }) {
  const items = [
    { label: "新收", value: digest.newIntake, color: "#5B8DEF", Icon: Briefcase },
    { label: "已结", value: digest.closed, color: "#48BB78", Icon: CheckCircle2 },
    { label: "已归档", value: digest.archived, color: "#9B7BF7", Icon: Archive },
    {
      label: "收款（元）",
      value: digest.receivedAmount.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      color: "#F5A742",
      Icon: Wallet
    }
  ];

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-medium">{digest.userName} · 本周摘要</h3>
        <span className="font-mono text-[10px] text-muted-foreground">{digest.period.label}</span>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {items.map(({ label, value, color, Icon }) => (
          <div key={label} className="rounded border border-border bg-background px-2 py-2">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Icon className="h-3 w-3" style={{ color }} strokeWidth={1.8} />
              {label}
            </div>
            <div className="mt-1 font-mono text-base tabular text-foreground">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
