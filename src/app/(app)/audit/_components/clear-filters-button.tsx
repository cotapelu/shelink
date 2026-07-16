"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ClearFiltersButtonProps {
  onClick: () => void;
}

export function ClearFiltersButton({ onClick }: ClearFiltersButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="ml-auto h-8 gap-1">
      <X className="h-3 w-3" />
      清空筛选
    </Button>
  );
}
