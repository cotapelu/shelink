"use client";

import { ApproveDialog } from "./approve-dialog";
import { RejectDialog } from "./reject-dialog";
import { DetailDialog } from "./detail-dialog";
import { BatchApproveDialog } from "./batch-approve-dialog";
import { BatchRejectDialog } from "./batch-reject-dialog";
import type { PendingRecord } from "./batch-reject-dialog";

interface ArchiveDialogsProps {
  dialog: { type: "approve" | "reject" | "detail"; record: PendingRecord } | null;
  batchAction: "approve" | "reject" | null;
  selectedRecords: PendingRecord[];
  onCloseDialog: () => void;
  onCloseBatch: (refreshed?: boolean) => void;
}

export function ArchiveDialogs({ dialog, batchAction, selectedRecords, onCloseDialog, onCloseBatch }: ArchiveDialogsProps) {
  return (
    <>
      {dialog?.type === "approve" && <ApproveDialog record={dialog.record} onClose={onCloseDialog} />}
      {dialog?.type === "reject" && <RejectDialog record={dialog.record} onClose={onCloseDialog} />}
      {dialog?.type === "detail" && <DetailDialog record={dialog.record} onClose={onCloseDialog} />}
      {batchAction === "approve" && <BatchApproveDialog records={selectedRecords} onClose={onCloseBatch} />}
      {batchAction === "reject" && <BatchRejectDialog records={selectedRecords} onClose={onCloseBatch} />}
    </>
  );
}
