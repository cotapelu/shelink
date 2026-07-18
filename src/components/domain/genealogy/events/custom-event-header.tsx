"use client";

import { X } from "lucide-react";

interface CustomEventHeaderProps {
  onClose: () => void;
  isEdit: boolean;
}

export function CustomEventHeader({ onClose, isEdit }: CustomEventHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">
        {isEdit ? "Chỉnh sửa sự kiện" : "Thêm sự kiện"}
      </h2>
      <button
        type="button"
        onClick={onClose}
        className="p-2 hover:bg-accent rounded-full transition-colors"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}
