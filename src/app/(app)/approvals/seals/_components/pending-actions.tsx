"use client";

import type { SealRequestRow } from "./seal-types";

interface PendingActionsProps {
  row: SealRequestRow;
  currentUser: { id: string; role: string };
  canApprove: boolean;
  onAction: (action: "approve" | "cancel") => void;
}

export function PendingActions({ row, currentUser, canApprove, onAction }: PendingActionsProps) {
  const isOwner = row.requestedById === currentUser.id;

  return (
    <div className="flex justify-end gap-1.5">
      {canApprove && (
        <button
          type="button"
          onClick={() => onAction("approve")}
          className="text-[11px] text-primary hover:underline"
        >
          Duyệt
        </button>
      )}
      {isOwner && (
        <>
          {canApprove && <span className="text-muted-foreground">|</span>}
          <button
            type="button"
            onClick={() => onAction("cancel")}
            className="text-[11px] text-muted-foreground hover:text-destructive"
          >
            Thu hồi
          </button>
        </>
      )}
    </div>
  );
}
