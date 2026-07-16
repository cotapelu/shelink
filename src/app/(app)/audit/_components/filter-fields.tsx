"use client";

import { SelectFilter } from "./select-filter";
import { DateRangeFilter } from "./date-range-filter";

interface FilterFieldsProps {
  currentFilter: any;
  options: { actions: string[]; targetTypes: string[]; users: { id: string; name: string }[] };
  onNavigate: (patch: Record<string, string | undefined>) => void;
}

export function FilterFields({ currentFilter, options, onNavigate }: FilterFieldsProps) {
  return (
    <>
      <SelectFilter
        label="操作人"
        value={currentFilter.userId || "__all__"}
        options={options.users.map(u => u.id)}
        onValueChange={(v) => onNavigate({ userId: v === "__all__" ? undefined : v })}
        placeholder="全部"
        triggerClassName="h-8 w-36 text-xs"
      />

      <SelectFilter
        label="动作"
        value={currentFilter.action || "__all__"}
        options={options.actions}
        onValueChange={(v) => onNavigate({ action: v === "__all__" ? undefined : v })}
        placeholder="全部"
        triggerClassName="h-8 w-48 text-xs"
      />

      <SelectFilter
        label="对象类型"
        value={currentFilter.targetType || "__all__"}
        options={options.targetTypes}
        onValueChange={(v) => onNavigate({ targetType: v === "__all__" ? undefined : v })}
        placeholder="全部"
        triggerClassName="h-8 w-36 text-xs"
      />

      <DateRangeFilter
        label="起始日"
        value={currentFilter.startStr}
        onChange={(start) => onNavigate({ start: start || undefined })}
      />

      <DateRangeFilter
        label="结束日"
        value={currentFilter.endStr}
        onChange={(end) => onNavigate({ end: end || undefined })}
      />
    </>
  );
}
