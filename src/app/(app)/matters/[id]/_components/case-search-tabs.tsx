"use client";

import { Button } from "@/components/ui/button";

type SearchMode = "keyword" | "vector";

interface CaseSearchTabsProps {
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}

export function CaseSearchTabs({ mode, onModeChange }: CaseSearchTabsProps) {
  return (
    <div className="flex gap-2">
      <Button variant={mode === "keyword" ? "default" : "outline"} size="sm" onClick={() => onModeChange("keyword")}>
        关键词检索
      </Button>
      <Button variant={mode === "vector" ? "default" : "outline"} size="sm" onClick={() => onModeChange("vector")}>
        向量检索 (AI)
      </Button>
    </div>
  );
}
