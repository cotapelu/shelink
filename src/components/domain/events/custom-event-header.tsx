"use client";

import { X, Star } from "lucide-react";
import { motion } from "framer-motion";

interface CustomEventHeaderProps {
  onClose: () => void;
  isEdit: boolean;
}

export function CustomEventHeader({ onClose, isEdit }: CustomEventHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Star className="size-6 text-amber-600" />
        <h2 className="text-xl sm:text-2xl font-serif font-bold leading-6 text-stone-800">
          {isEdit ? "Sửa Sự Kiện" : "Thêm Sự Kiện Tuỳ Chỉnh"}
        </h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-2 hover:bg-stone-100 rounded-full transition-colors"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}
