"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface SealsHeaderProps {
  onNewClick: () => void;
}

export function SealsHeader({ onNewClick }: SealsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl">Duyệt · Dùng dấu</h1>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Tương lai có thể mở thêm các loại duyệt khác như duyệt nội bộ văn bản
        </p>
      </div>
      <Button onClick={onNewClick} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Tạo yêu cầu dùng dấu
      </Button>
    </div>
  );
}
