"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface CustomEventFooterProps {
  loading: boolean;
  isEdit: boolean;
  onCancel: () => void;
  onDelete?: () => void;
}

export function CustomEventFooter({ loading, isEdit, onCancel, onDelete }: CustomEventFooterProps) {
  return (
    <div className="flex justify-between items-center gap-4 pt-4 sm:pt-6">
      {isEdit && onDelete && (
        <Button
          type="button"
          variant="outline"
          onClick={onDelete}
          disabled={loading}
          className="text-rose-600 border-rose-200/50 hover:bg-rose-50"
        >
          Xoá sự kiện
        </Button>
      )}
      {!isEdit && <div />}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Huỷ bỏ
        </Button>
        <Button type="submit" disabled={loading} className="bg-stone-800 hover:bg-stone-700 text-white">
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {loading ? "Đang lưu..." : "Lưu sự kiện"}
        </Button>
      </div>
    </div>
  );
}
