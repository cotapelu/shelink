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
        Tra theo từ khoá
      </Button>
      <Button variant={mode === "vector" ? "default" : "outline"} size="sm" onClick={() => onModeChange("vector")}>
        Tra vector (AI)
      </Button>
    </div>
  );
}
