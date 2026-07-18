"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface CustomEventFooterProps {
  loading: boolean;
  isEdit: boolean;
  onCancel: () => void;
}

export function CustomEventFooter({ loading, isEdit, onCancel }: CustomEventFooterProps) {
  return (
    <div className="flex items-center gap-2 justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={loading}
      >
        Hủy
      </Button>
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
        {isEdit ? "Lưu thay đổi" : "Thêm sự kiện"}
      </Button>
    </div>
  );
}
