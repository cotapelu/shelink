"use client";

import { X } from "lucide-react";
import { motion } from "framer-motion";

interface InvoiceBuilderHeaderProps {
  onClose?: () => void;
}

export function InvoiceBuilderHeader({ onClose }: InvoiceBuilderHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <motion.h1 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold">
        Tạo hóa đơn
      </motion.h1>
      {onClose && (
        <motion.button initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} onClick={onClose} className="p-2 hover:bg-accent rounded-full">
          <X className="size-5" />
        </motion.button>
      )}
    </div>
  );
}
