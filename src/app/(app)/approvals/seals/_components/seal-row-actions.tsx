"use client";

import type { SealRequestRow } from "./seal-types";
import { PendingActions } from "./pending-actions";
import { ApprovedStampButton } from "./approved-stamp-button";
import { StampedDownload } from "./stamped-download";
import { RejectedBadge } from "./rejected-badge";

function computeCanStamp(
  isOwner: boolean,
  isAdmin: boolean,
  role: string,
  sealType: string | undefined
): boolean {
  return isOwner || isAdmin || (role === "FINANCE" && sealType === "FINANCE_SEAL");
}

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
  const { status, stampedDoc, sealType, requestedById } = row;
  const isOwner = requestedById === currentUser.id;
  const isAdmin = ["ADMIN", "PRINCIPAL_LAWYER"].includes(currentUser.role);
  const canStamp = computeCanStamp(isOwner, isAdmin, currentUser.role, sealType);

  if (status === "PENDING") {
    return (
      <PendingActions
        row={row}
        currentUser={currentUser}
        canApprove={canApprove}
        onAction={onAction}
      />
    );
  }

  if (status === "APPROVED" && canStamp) {
    return <ApprovedStampButton onAction={onAction} />;
  }

  if (status === "STAMPED" && stampedDoc) {
    return <StampedDownload stampedDoc={stampedDoc} />;
  }

  if (status === "REJECTED" && isAdmin) {
    return <RejectedBadge />;
  }

  return null;
}

