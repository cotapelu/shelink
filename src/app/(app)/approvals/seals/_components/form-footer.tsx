"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface FormFooterProps {
  pending: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export function FormFooter({ pending, onCancel, onSubmit }: FormFooterProps) {
  return (
    <div className="mt-6 md:col-span-2">
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={onSubmit} disabled={pending}>
          {pending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
          提交申请
        </Button>
      </DialogFooter>
    </div>
  );
}
