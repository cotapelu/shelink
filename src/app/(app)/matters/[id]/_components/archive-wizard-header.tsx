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
            归档案件
          </DialogTitle>
          <DialogDescription>
            步骤 {step + 1} / {totalSteps} · 提交后进入管理员审批；审批通过后案件转为只读，并生成卷宗封皮和卷宗目录入归档卷宗。
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

import { FileCheck2 } from "lucide-react";
