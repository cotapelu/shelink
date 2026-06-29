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
/**
 * v0.38: 通讯录独立页（v0.37 曾并入 /service-center，现拆回）
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listExternalContacts } from "@/server/external-contacts/actions";
import { prisma } from "@/lib/prisma";
import { ContactsView } from "./_components/contacts-view";

export default async function ContactsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const [externalContacts, colleagues] = await Promise.all([
    listExternalContacts(),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, email: true, phone: true, role: true, avatar: true },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <ContactsView
      colleagues={colleagues}
      externalContacts={externalContacts}
      currentUserId={session.user.id}
      currentUserRole={session.user.role}
    />
  );
}
