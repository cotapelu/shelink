"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

interface ArchiveWizardHeaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: number;
  totalSteps: number;
  children: React.ReactNode;
}

export function ArchiveWizardHeader({ open, onOpenChange, step, totalSteps, children }: ArchiveWizardHeaderProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-[#9B7BF7]" />
            Lưu trữ vụ án
          </DialogTitle>
          <DialogDescription>
            Bước {step + 1} / {totalSteps} · Sau khi gửi sẽ vào duyệt của quản trị viên; duyệt xong vụ án chuyển sang chỉ đọc, đồng thời sinh bìa hồ sơ và mục lục hồ sơ vào hồ sơ lưu trữ.
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

import { FileCheck2 } from "lucide-react";
