"use client";

import { ClearFiltersButton } from "./clear-filters-button";
import { FilterFields } from "./filter-fields";

interface FilterRowProps {
  currentFilter: any;
  options: { actions: string[]; targetTypes: string[]; users: { id: string; name: string }[] };
  onNavigate: (patch: Record<string, string | undefined>) => void;
  showClear: boolean;
}

export function FilterRow({ currentFilter, options, onNavigate, showClear }: FilterRowProps) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <FilterFields currentFilter={currentFilter} options={options} onNavigate={onNavigate} />
      {showClear && <ClearFiltersButton onClick={() => onNavigate({ userId: undefined, action: undefined, targetType: undefined, start: undefined, end: undefined })} />}
    </div>
  );
}
