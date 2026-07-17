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

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookUser } from "lucide-react";
import type { ExternalContactCategory, ExternalContactStatus } from "@prisma/client";
import { ExternalContactDialog } from "./external-contact-dialog";
import { ColleagueSection } from "./colleague-section";
import { ExternalContactsSection } from "./external-contacts-section";

type ColleagueItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar: string | null;
};

export type ExternalContactItem = {
  id: string;
  name: string;
  category: ExternalContactCategory;
  organization: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
  wechat: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
  status: ExternalContactStatus;
  createdBy: { id: string; name: string };
  reviewedBy: { id: string; name: string } | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
};

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExternalContactItem | null>(null);
  const [filter, setFilter] = useState<ExternalContactCategory | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const router = useRouter();
  const canReviewContacts =
    currentUserRole === "ADMIN" || currentUserRole === "PRINCIPAL_LAWYER";

  function handleAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl">
          <BookUser className="h-5 w-5 text-primary" strokeWidth={1.8} />
          通讯录
        </h1>
        <p className="mt-0.5 text-[12px] text-muted-foreground">本所同事与外部联系人</p>
      </header>

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
        onEdit={(c) => {
          setEditing(c);
          setDialogOpen(true);
        }}
      />

      <ExternalContactDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  );
}
