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

import { Users, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { userRoleLabel } from "@/lib/enums";
import type { MatterPayload } from "./matter-detail-tabs";

export function OverviewPanel({ matter }: { matter: MatterPayload }) {
  const upcomingDeadlines = matter.procedures
    .flatMap((p) =>
      p.deadlines
        .filter((d) => !d.completed)
        .map((d) => ({ ...d, procedureLabel: p.customLabel ?? p.type }))
    )
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 5);

  const upcomingHearings = matter.procedures
    .flatMap((p) =>
      p.hearings
        .filter((h) => new Date(h.startsAt) >= new Date())
        .map((h) => ({ ...h, procedureLabel: p.customLabel ?? p.type }))
    )
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* 近期期限 */}
      <section className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <Briefcase className="h-4 w-4 text-primary" />
          近期期限
        </h2>
        {upcomingDeadlines.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            暂无未完成的期限
          </p>
        ) : (
          <ul className="space-y-2">
            {upcomingDeadlines.map((d) => {
              const days = Math.ceil(
                (new Date(d.dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              const isWarn = days <= 3 && days >= 0;
              const isOverdue = days < 0;
              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
                >
                  <div className="flex-1 overflow-hidden">
                    <div className="truncate text-sm">{d.title}</div>
                    <div className="text-xs text-muted-foreground">{d.procedureLabel}</div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-mono text-sm tabular ${
                        isOverdue
                          ? "text-destructive"
                          : isWarn
                            ? "text-[#FBBF24]"
                            : "text-foreground"
                      }`}
                    >
                      {isOverdue ? `逾期 ${-days} 天` : days === 0 ? "今天" : `${days} 天`}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground tabular">
                      {new Date(d.dueAt).toLocaleDateString("zh-CN")}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 近期开庭 */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-base font-semibold">近期开庭</h2>
        {upcomingHearings.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">暂无</p>
        ) : (
          <ul className="space-y-2">
            {upcomingHearings.map((h) => (
              <li
                key={h.id}
                className="rounded-md border border-border bg-background px-3 py-2"
              >
                <div className="text-sm font-medium">{h.title}</div>
                <div className="mt-0.5 font-mono text-xs text-muted-foreground tabular">
                  {new Date(h.startsAt).toLocaleString("zh-CN", {
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 团队 */}
      <section className="rounded-xl border border-border bg-card p-5 lg:col-span-3">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <Users className="h-4 w-4 text-primary" />
          团队成员
        </h2>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {matter.members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between rounded-md border border-border bg-background p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-xs font-semibold text-primary">
                  {m.user.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium">{m.user.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {userRoleLabel[m.user.role]}
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {m.role === "LEAD" ? "主办" : m.role === "CO_LEAD" ? "协办" : "助理"}
              </Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
