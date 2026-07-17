"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import type { ExternalContactCategory } from "@prisma/client";

const EXT_CATEGORY_LABEL: Record<ExternalContactCategory, string> = {
  COURT: "法院",
  PROSECUTOR: "检察院",
  POLICE: "公安",
  NOTARY: "公证处",
  ARBITRATION: "仲裁",
  OTHER_FIRM: "他所律师",
  EXPERT: "鉴定专家",
  OTHER: "其他"
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
          外部联系人
          <span className="text-muted-foreground">({search ? '?' : '?'})</span>
          {canReviewContacts && pendingCount > 0 && (
            <span className="rounded-full border border-amber-300/70 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              待审核 {pendingCount}
            </span>
          )}
        </h2>
        <Button size="sm" onClick={onAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          新增
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
          全部
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
          placeholder="搜索姓名 / 单位 / 电话"
          className="ml-auto h-8 w-48 rounded-md border border-border bg-background px-3 text-xs"
        />
      </div>
    </div>
  );
}
