"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import type { ExternalContactCategory } from "@prisma/client";

const EXT_CATEGORY_LABEL: Record<ExternalContactCategory, string> = {
  COURT: "Toà án",
  PROSECUTOR: "Viện kiểm sát",
  POLICE: "Công an",
  NOTARY: "Phòng công chứng",
  ARBITRATION: "Trọng tài",
  OTHER_FIRM: "Luật sư VP khác",
  EXPERT: "Chuyên gia giám định",
  OTHER: "Khác"
};

interface ExternalContactFilterBarProps {
  filter: ExternalContactCategory | "ALL";
  onFilterChange: (f: ExternalContactCategory | "ALL") => void;
  search: string;
  onSearchChange: (s: string) => void;
  canReviewContacts: boolean;
  pendingCount: number;
  onAdd: () => void;
}

export function ExternalContactFilterBar({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  canReviewContacts,
  pendingCount,
  onAdd
}: ExternalContactFilterBarProps) {
  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          Liên hệ ngoài
          <span className="text-muted-foreground">({search ? '?' : '?'})</span>
          {canReviewContacts && pendingCount > 0 && (
            <span className="rounded-full border border-amber-300/70 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              Chờ duyệt {pendingCount}
            </span>
          )}
        </h2>
        <Button size="sm" onClick={onAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Thêm
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onFilterChange("ALL")}
          className={cn(
            "rounded-full border px-3 py-0.5 text-[11px] transition-colors",
            filter === "ALL"
              ? "border-primary bg-primary/15 text-primary"
              : "border-border bg-background text-muted-foreground hover:border-input"
          )}
        >
          Tất cả
        </button>
        {(Object.keys(EXT_CATEGORY_LABEL) as ExternalContactCategory[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onFilterChange(c)}
            className={cn(
              "rounded-full border px-3 py-0.5 text-[11px] transition-colors",
              filter === c
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-input"
            )}
          >
            {EXT_CATEGORY_LABEL[c]}
          </button>
        ))}
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm họ tên / đơn vị / điện thoại"
          className="ml-auto h-8 w-48 rounded-md border border-border bg-background px-3 text-xs"
        />
      </div>
    </div>
  );
}
