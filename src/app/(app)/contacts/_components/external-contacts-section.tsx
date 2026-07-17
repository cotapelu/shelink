"use client";

import { ExternalContactFilterBar } from "./external-contact-filter-bar";
import { ExternalContactList } from "./external-contact-list";
import type { ExternalContactItem } from "./contacts-view";
import type { ExternalContactCategory } from "@prisma/client";

interface ExternalContactsSectionProps {
  externalContacts: ExternalContactItem[];
  currentUserId: string;
  currentUserRole: string;
  canReviewContacts: boolean;
  onAdd: () => void;
  filter: ExternalContactCategory | "ALL";
  onFilterChange: (f: ExternalContactCategory | "ALL") => void;
  search: string;
  onSearchChange: (s: string) => void;
  onEdit: (c: ExternalContactItem) => void;
}

export function ExternalContactsSection({
  externalContacts,
  currentUserId,
  currentUserRole,
  canReviewContacts,
  onAdd,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  onEdit
}: ExternalContactsSectionProps) {
  const filteredExternal = externalContacts.filter((c) => {
    if (filter !== "ALL" && c.category !== filter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hit =
        c.name.toLowerCase().includes(q) ||
        (c.organization && c.organization.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q));
      if (!hit) return false;
    }
    return true;
  });

  return (
    <div className="space-y-3">
      <ExternalContactFilterBar
        filter={filter}
        onFilterChange={onFilterChange}
        search={search}
        onSearchChange={onSearchChange}
        canReviewContacts={canReviewContacts}
        pendingCount={externalContacts.filter((c) => c.status === "PENDING_REVIEW").length}
        onAdd={onAdd}
      />
      <ExternalContactList
        externalContacts={filteredExternal}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        canReviewContacts={canReviewContacts}
        onEdit={onEdit}
      />
    </div>
  );
}
