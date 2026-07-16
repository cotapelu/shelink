"use client";

import { FilterRow } from "./filter-row";
import type { AuditFilter } from "@/server/audit-list";

interface Options {
  actions: string[];
  targetTypes: string[];
  users: { id: string; name: string }[];
}

interface AuditFiltersProps {
  options: Options;
  currentFilter: AuditFilter;
  onNavigate: (patch: Record<string, string | undefined>) => void;
}

export function AuditFilters({ options, currentFilter, onNavigate }: AuditFiltersProps) {
  const hasFilter =
    !!currentFilter.userId ||
    !!currentFilter.action ||
    !!currentFilter.targetType ||
    !!currentFilter.startStr ||
    !!currentFilter.endStr;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
      <FilterRow
        currentFilter={currentFilter}
        options={options}
        onNavigate={onNavigate}
        showClear={hasFilter}
      />
    </div>
  );
}
