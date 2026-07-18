"use client";

import { Button } from "@/components/ui/button";
import { Check, XCircle, Pencil, Archive } from "lucide-react";
import type { ExternalContactItem } from "./contacts-types";
import type { ExternalContactCategory } from "@prisma/client";
const L: Record<ExternalContactCategory, string> = {
  COURT: "法院", PROSECUTOR: "检察院", POLICE: "公安", NOTARY: "公证处",
  ARBITRATION: "仲裁", OTHER_FIRM: "他所律师", EXPERT: "鉴定专家", OTHER: "其他"
};

interface ExternalContactRowContentProps {
  contact: ExternalContactItem;
  canEdit: boolean;
  canReview: boolean;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onArchive: () => void;
}

export function ExternalContactRowContent({
  contact, canEdit, canReview, onEdit, onApprove, onReject, onArchive
}: ExternalContactRowContentProps) {
  return (
    <li className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{contact.name}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{L[contact.category]}</span>
          {contact.status === "PENDING_REVIEW" && <span className="rounded-full border border-amber-300/70 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">待审核</span>}
          {contact.title && <span className="text-[11px] text-muted-foreground">{contact.title}</span>}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {contact.organization && <div>{contact.organization}</div>}
          <div>{contact.phone || contact.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="size-4" /></Button>
        {contact.status === "PENDING_REVIEW" && canReview && (
          <>
            <Button variant="ghost" size="icon" onClick={onApprove}><Check className="size-4 text-green-600" /></Button>
            <Button variant="ghost" size="icon" onClick={onReject}><XCircle className="size-4 text-rose-600" /></Button>
          </>
        )}
        {canEdit && <Button variant="ghost" size="icon" onClick={onArchive}><Archive className="size-4" /></Button>}
      </div>
    </li>
  );
}
