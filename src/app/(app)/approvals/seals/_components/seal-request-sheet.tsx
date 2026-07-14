"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SealRequestForm } from "./seal-request-form";
import type { SealTypeConfigRow, MatterOption } from "./seal-types";

export function SealRequestSheet({
  open,
  onOpenChange,
  configs,
  matters,
  preset
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  configs: SealTypeConfigRow[];
  matters: MatterOption[];
  preset: { draftDocId?: string; matterId?: string; documentTitle?: string } | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[92vw] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新建用章申请</DialogTitle>
        </DialogHeader>
        <SealRequestForm
          configs={configs}
          matters={matters}
          preset={preset}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}
