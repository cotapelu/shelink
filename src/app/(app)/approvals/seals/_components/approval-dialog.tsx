"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  approveSealRequest,
  rejectSealRequest
} from "@/server/seals/actions";
import { type SealRequestRow } from "./seal-types";
import { ApprovalDialogFields } from "./approval-dialog-fields";

interface ApprovalDialogProps {
  row: SealRequestRow;
  action: "approve" | "reject";
  onClose: () => void;
}

function useApprovalSubmit(row: SealRequestRow, mode: "approve" | "reject", note: string, onClose: () => void, startTransition: (cb: () => void) => void): () => void {
  return () => {
    if (mode === "reject" && !note.trim()) { toast.error("Từ chối cần ghi rõ lý do"); return; }
    startTransition(async () => {
      try {
        if (mode === "approve") { await approveSealRequest({ id: row.id, note: note.trim() }); toast.success("Đã duyệt"); }
        else { await rejectSealRequest({ id: row.id, reason: note.trim() }); toast.success("Đã từ chối"); }
        onClose();
      } catch (e) { toast.error(e instanceof Error ? e.message : "Thao tác thất bại"); }
    });
  };
}

export function ApprovalDialog({ row, action, onClose }: ApprovalDialogProps) {
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"approve" | "reject">(action);
  const [pending, startTransition] = useTransition();
  const submit = useApprovalSubmit(row, mode, note, onClose, startTransition);
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[88vh] w-[92vw] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Duyệt yêu cầu dùng dấu</DialogTitle></DialogHeader>
        <ApprovalDialogFields row={row} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button size="sm" variant={mode === "approve" ? "default" : "outline"} onClick={() => setMode("approve")} className="flex-1">Duyệt</Button>
          <Button size="sm" variant={mode === "reject" ? "destructive" : "outline"} onClick={() => setMode("reject")} className="flex-1">Từ chối</Button>
        </div>
        <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder={mode === "approve" ? "Ý kiến duyệt (tuỳ chọn)" : "Lý do từ chối (bắt buộc)"} rows={2} className="mt-2 text-[12px]" />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={submit} disabled={pending}>{pending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Gửi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
