"use client";

import type { SealRequestRow } from "./seal-types";

export function SealRowActions({
  row,
  currentUser,
  canApprove,
  onAction
}: {
  row: SealRequestRow;
  currentUser: { id: string; role: string };
  canApprove: boolean;
  onAction: (action: "detail" | "approve" | "reject" | "stamp" | "cancel") => void;
}) {
  const isOwner = row.requestedById === currentUser.id;
  const isAdmin = ["ADMIN", "PRINCIPAL_LAWYER"].includes(currentUser.role);
  const canStamp =
    isOwner ||
    isAdmin ||
    (currentUser.role === "FINANCE" && row.sealType === "FINANCE_SEAL");
  const { status, stampedDoc } = row;

  if (status === "PENDING") {
    return (
      <div className="flex justify-end gap-1.5">
        {canApprove && (
          <button
            type="button"
            onClick={() => onAction("approve")}
            className="text-[11px] text-primary hover:underline"
          >
            审批
          </button>
        )}
        {isOwner && (
          <>
            {canApprove && (
              <span className="text-muted-foreground">|</span>
            )}
            <button
              type="button"
              onClick={() => onAction("cancel")}
              className="text-[11px] text-muted-foreground hover:text-destructive"
            >
              撤销
            </button>
          </>
        )}
      </div>
    );
  }

  if (status === "APPROVED" && canStamp) {
    return (
      <button
        type="button"
        onClick={() => onAction("stamp")}
        className="text-[11px] text-primary hover:underline"
      >
        回填盖章件
      </button>
    );
  }

  if (status === "STAMPED" && stampedDoc) {
    return (
      <a
        href={`/api/documents/${stampedDoc.id}/download`}
        className="text-[11px] text-muted-foreground hover:text-foreground"
      >
        下载
      </a>
    );
  }

  if (status === "REJECTED" && isAdmin) {
    return <span className="text-[10px] text-muted-foreground">已驳回</span>;
  }

  return null;
}
