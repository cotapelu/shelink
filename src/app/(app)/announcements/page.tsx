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
 * v0.38: 公告指引独立页（v0.37 曾并入 /service-center，现拆回）
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listAnnouncements } from "@/server/announcements/actions";
import { AnnouncementsView } from "./_components/announcements-view";

export default async function AnnouncementsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const isManager =
    session.user.role === "ADMIN" || session.user.role === "PRINCIPAL_LAWYER";
  const announcements = await listAnnouncements();

  return (
    <AnnouncementsView
      items={announcements}
      isManager={isManager}
      currentUserId={session.user.id}
    />
  );
}
