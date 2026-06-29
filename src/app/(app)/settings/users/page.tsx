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
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listUsers } from "@/server/users/actions";
import { UsersView } from "./_components/users-view";

export default async function UsersPage() {
  const session = await getSession();
  if (session?.user.role !== "ADMIN") {
    redirect("/settings/profile");
  }

  const users = await listUsers();
  return <UsersView users={users} currentUserId={session.user.id} />;
}
