/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
"use client";

import { ExternalContactDialog } from "./external-contact-dialog";
import { ColleagueSection } from "./colleague-section";
import { ExternalContactsSection } from "./external-contacts-section";
import { ContactsHeader } from "./contacts-header";
import { useContactsState } from "./use-contacts-state";
import type { ColleagueItem, ExternalContactItem } from "./contacts-types";

export function ContactsView({
  colleagues,
  externalContacts,
  currentUserId,
  currentUserRole
}: {
  colleagues: ColleagueItem[];
  externalContacts: ExternalContactItem[];
  currentUserId: string;
  currentUserRole: string;
}) {
  const {
    dialogOpen,
    setDialogOpen,
    editing,
    filter,
    setFilter,
    search,
    setSearch,
    handleAdd,
    handleEdit
  } = useContactsState();

  const canReviewContacts = currentUserRole === "ADMIN" || currentUserRole === "PRINCIPAL_LAWYER";

  return (
    <div className="space-y-6">
      <ContactsHeader />
      <ColleagueSection colleagues={colleagues} />
      <ExternalContactsSection
        externalContacts={externalContacts}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        canReviewContacts={canReviewContacts}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
      />
      <ExternalContactDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  );
}
