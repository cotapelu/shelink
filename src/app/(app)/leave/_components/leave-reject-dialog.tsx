"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

/** Hộp thoại nhập lý do từ chối đơn nghỉ phép. */
export function LeaveRejectDialog({
  open,
  onOpenChange,
  onConfirm
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Từ chối đơn nghỉ phép</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Lý do (bắt buộc)</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nhập lý do từ chối…"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button
            size="sm"
            variant="destructive"
            disabled={!note.trim()}
            onClick={() => {
              onConfirm(note.trim());
              setNote("");
            }}
          >
            Từ chối
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
