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

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import type { AuditFilter } from "@/server/audit-list";

const ALL_VALUE = "__all__";

type Options = {
  actions: string[];
  targetTypes: string[];
  users: { id: string; name: string }[];
};

export function AuditFilters({
  options,
  currentFilter,
  onNavigate,
}: {
  options: Options;
  currentFilter: AuditFilter;
  onNavigate: (patch: Record<string, string | undefined>) => void;
}) {
  const hasFilter =
    !!currentFilter.userId ||
    !!currentFilter.action ||
    !!currentFilter.targetType ||
    !!currentFilter.startStr ||
    !!currentFilter.endStr;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-end gap-2">
        <FilterCol label="操作人">
          <Select
            value={currentFilter.userId || ALL_VALUE}
            onValueChange={(v) => onNavigate({ userId: v === ALL_VALUE ? undefined : v })}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>全部</SelectItem>
              {options.users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterCol>

        <FilterCol label="动作">
          <Select
            value={currentFilter.action || ALL_VALUE}
            onValueChange={(v) => onNavigate({ action: v === ALL_VALUE ? undefined : v })}
          >
            <SelectTrigger className="h-8 w-48 text-xs">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>全部</SelectItem>
              {options.actions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterCol>

        <FilterCol label="对象类型">
          <Select
            value={currentFilter.targetType || ALL_VALUE}
            onValueChange={(v) => onNavigate({ targetType: v === ALL_VALUE ? undefined : v })}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>全部</SelectItem>
              {options.targetTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterCol>

        <FilterCol label="起始日">
          <Input
            type="date"
            value={currentFilter.startStr ?? ""}
            onChange={(e) => onNavigate({ start: e.target.value || undefined })}
            className="h-8 w-36 text-xs"
          />
        </FilterCol>

        <FilterCol label="结束日">
          <Input
            type="date"
            value={currentFilter.endStr ?? ""}
            onChange={(e) => onNavigate({ end: e.target.value || undefined })}
            className="h-8 w-36 text-xs"
          />
        </FilterCol>

        {hasFilter && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onNavigate({
                userId: undefined,
                action: undefined,
                targetType: undefined,
                start: undefined,
                end: undefined,
              })
            }
            className="ml-auto h-8 gap-1"
          >
            <X className="h-3 w-3" />
            清空筛选
          </Button>
        )}
      </div>
    </div>
  );
}

function FilterCol({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground">{label}</label>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
