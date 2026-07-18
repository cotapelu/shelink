"use client";

import type { ExternalContactItem } from "./contacts-view";
import { ExternalContactItemRow } from "./external-contact-item-row";

interface ExternalContactListProps {
  externalContacts: ExternalContactItem[];
  currentUserId: string;
  currentUserRole: string;
  canReviewContacts: boolean;
  onEdit: (c: ExternalContactItem) => void;
}

export function ExternalContactList({
  externalContacts,
  currentUserId,
  currentUserRole,
  canReviewContacts,
  onEdit
}: ExternalContactListProps) {
  if (externalContacts.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-background py-8 text-center text-xs text-muted-foreground">
        暂无匹配联系人
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {externalContacts.map(c => (
        <ExternalContactItemRow
          key={c.id}
          contact={c}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          canReviewContacts={canReviewContacts}
          onEdit={onEdit}
        />
      ))}
    </ul>
  );
}
