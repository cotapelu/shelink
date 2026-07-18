"use client";

interface EventsToolbarProps {
  filter: "all" | "birthday" | "death_anniversary" | "custom_event";
  setFilter: (f: "all" | "birthday" | "death_anniversary" | "custom_event") => void;
  showDeceasedBirthdays: boolean;
  setShowDeceasedBirthdays: (v: boolean) => void;
  totalCount: number;
}

const FILTER_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "birthday", label: "Sinh nhật" },
  { key: "death_anniversary", label: "Ngày giỗ" },
  { key: "custom_event", label: "Tuỳ chỉnh" },
] as const;

export function EventsToolbar({ filter, setFilter, showDeceasedBirthdays, setShowDeceasedBirthdays, totalCount }: EventsToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filter === tab.key
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-white/80 text-stone-600 border border-stone-200/60 hover:border-amber-200 hover:text-amber-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-stone-400 self-center">
          {totalCount} sự kiện trong năm
        </span>
      </div>

      {/* Toggle options */}
      <div className="flex px-1">
        <label className="flex items-center gap-2.5 text-sm font-medium text-stone-600 cursor-pointer hover:text-stone-900 transition-colors select-none">
          <input
            type="checkbox"
            checked={showDeceasedBirthdays}
            onChange={(e) => setShowDeceasedBirthdays(e.target.checked)}
            className="rounded-md border-stone-300 text-amber-500 focus:ring-amber-500 size-4 transition-all"
          />
          Hiển thị sinh nhật của người đã mất
        </label>
      </div>
    </div>
  );
}
