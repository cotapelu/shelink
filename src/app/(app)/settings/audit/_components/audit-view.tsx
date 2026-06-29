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

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ScrollText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

type AuditItem = {
  id: string;
  userId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  user: { id: string; name: string } | null;
};

const actionColor: Record<string, string> = {
  LOGIN: "#5B8DEF",
  MATTER_CREATE: "#4ADE80",
  MATTER_CLOSE: "#FBBF24",
  MATTER_ARCHIVE: "#9B7BF7",
  MATTER_DELETE: "#F87171",
  CLIENT_CREATE: "#4ADE80",
  CLIENT_DELETE: "#F87171",
  CONFLICT_CHECK_RUN: "#FBBF24",
  FEE_ENTRY_CREATE: "#4ADE80",
  USER_CREATE: "#4ADE80",
  USER_DEACTIVATE: "#F87171",
  USER_PASSWORD_RESET: "#FB923C"
};

function colorFor(action: string) {
  if (actionColor[action]) return actionColor[action];
  if (action.endsWith("_CREATE") || action.endsWith("_ADD")) return "#4ADE80";
  if (action.endsWith("_DELETE") || action.endsWith("_DEACTIVATE")) return "#F87171";
  if (action.endsWith("_UPDATE") || action.endsWith("_EDIT")) return "#FBBF24";
  if (action.endsWith("_VIEW")) return "#9BA8C7";
  return "#5B8DEF";
}

export function AuditView({
  items,
  distinctActions,
  userOptions,
  initialFilters
}: {
  items: AuditItem[];
  distinctActions: string[];
  userOptions: { id: string; name: string }[];
  initialFilters: { action: string; userId: string; days: string };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [action, setAction] = useState(initialFilters.action);
  const [userId, setUserId] = useState(initialFilters.userId);
  const [days, setDays] = useState(initialFilters.days);

  const updateUrl = useCallback(
    (next: Partial<{ action: string; userId: string; days: string }>) => {
      const params = new URLSearchParams();
      const a = next.action ?? action;
      const u = next.userId ?? userId;
      const d = next.days ?? days;
      if (a && a !== "ALL") params.set("action", a);
      if (u && u !== "ALL") params.set("userId", u);
      if (d && d !== "30") params.set("days", d);
      startTransition(() => {
        router.replace(`/settings/audit${params.toString() ? `?${params.toString()}` : ""}`);
      });
    },
    [router, action, userId, days]
  );

  function reset() {
    setAction("ALL");
    setUserId("ALL");
    setDays("30");
    startTransition(() => router.replace("/settings/audit"));
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ScrollText className="h-4 w-4 text-primary" />
          审计日志{" "}
          <span className="text-muted-foreground">({items.length})</span>
        </h2>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <Select
          value={action}
          onValueChange={(v) => {
            setAction(v);
            updateUrl({ action: v });
          }}
        >
          <SelectTrigger className="h-9 w-44 bg-background">
            <SelectValue placeholder="动作" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="ALL">全部动作</SelectItem>
            {distinctActions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={userId}
          onValueChange={(v) => {
            setUserId(v);
            updateUrl({ userId: v });
          }}
        >
          <SelectTrigger className="h-9 w-40 bg-background">
            <SelectValue placeholder="用户" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部用户</SelectItem>
            {userOptions.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={days}
          onValueChange={(v) => {
            setDays(v);
            updateUrl({ days: v });
          }}
        >
          <SelectTrigger className="h-9 w-32 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">近 7 天</SelectItem>
            <SelectItem value="30">近 30 天</SelectItem>
            <SelectItem value="90">近 90 天</SelectItem>
            <SelectItem value="365">近 1 年</SelectItem>
          </SelectContent>
        </Select>

        {(action !== "ALL" || userId !== "ALL" || days !== "30") && (
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">没有匹配的审计记录</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it) => {
            const color = colorFor(it.action);
            return (
              <li
                key={it.id}
                className="flex items-start gap-3 rounded-md border border-border bg-card px-4 py-2.5"
              >
                <span
                  className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
                />
                <div className="flex-1 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px]"
                      style={{ borderColor: `${color}50`, color }}
                    >
                      {it.action}
                    </Badge>
                    {it.targetType && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {it.targetType}
                      </span>
                    )}
                    {it.targetId && (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {it.targetId.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  {it.detail !== null && it.detail !== undefined && (
                    <pre className="mt-1 max-h-24 overflow-hidden font-mono text-[10px] text-muted-foreground/80">
                      {JSON.stringify(it.detail, null, 0)}
                    </pre>
                  )}
                </div>
                <div className="text-right text-xs">
                  <div>{it.user?.name ?? "—"}</div>
                  <div className="font-mono text-[10px] text-muted-foreground tabular">
                    {new Date(it.createdAt).toLocaleString("zh-CN", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
