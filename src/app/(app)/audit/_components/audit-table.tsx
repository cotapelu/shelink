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

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { AuditListResult } from "@/server/audit-list";

export function AuditTable({
  result,
  expanded,
  onToggleExpand,
  onNextPage,
}: {
  result: AuditListResult;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onNextPage: () => void;
}) {
  return (
    <>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 text-muted-foreground">
            <tr>
              <th className="w-8 px-2 py-1.5"></th>
              <th className="w-40 px-2 py-1.5 text-left font-normal">时间</th>
              <th className="w-20 px-2 py-1.5 text-left font-normal">操作人</th>
              <th className="px-2 py-1.5 text-left font-normal">动作</th>
              <th className="w-32 px-2 py-1.5 text-left font-normal">对象类型</th>
              <th className="w-40 px-2 py-1.5 text-left font-normal">对象 ID</th>
              <th className="w-24 px-2 py-1.5 text-left font-normal">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-10 text-center text-muted-foreground">
                  没有匹配的审计记录
                </td>
              </tr>
            ) : (
              result.items.flatMap((e: any) => {
                const hasDetail = e.detail !== null && e.detail !== undefined;
                const isOpen = expanded.has(e.id);
                const rows = [
                  <tr
                    key={e.id}
                    className={cn("hover:bg-muted/20", isOpen && "bg-muted/20")}
                  >
                    <td className="px-2 py-1.5 text-center">
                      {hasDetail && (
                        <button
                          type="button"
                          onClick={() => onToggleExpand(e.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {isOpen ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                      {e.createdAt.toLocaleString("zh-CN")}
                    </td>
                    <td className="px-2 py-1.5">{e.user?.name ?? "—"}</td>
                    <td className="px-2 py-1.5 font-mono text-foreground">{e.action}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{e.targetType ?? "—"}</td>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                      {e.targetId
                        ? e.targetId.length > 18
                          ? `${e.targetId.slice(0, 8)}…${e.targetId.slice(-6)}`
                          : e.targetId
                        : "—"}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                      {e.ip ?? "—"}
                    </td>
                  </tr>,
                ];
                if (isOpen && hasDetail) {
                  rows.push(
                    <tr key={`${e.id}-detail`}>
                      <td></td>
                      <td colSpan={6} className="px-2 pb-2 pt-0">
                        <pre className="overflow-x-auto rounded bg-muted/40 p-2 font-mono text-[10px] text-foreground">
                          {JSON.stringify(e.detail, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  );
                }
                return rows;
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
        <span>本页 {result.items.length} 条</span>
        {result.nextCursor && (
          <Button size="sm" variant="outline" onClick={onNextPage}>
            下一页 →
          </Button>
        )}
      </div>
    </>
  );
}
