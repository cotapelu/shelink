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
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./options";

/**
 * Server Component / Server Action 中读取当前 session。
 * 未登录返回 null。
 */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * 要求登录，未登录强制跳 /login。
 * 在 Server Component / Server Action 中使用。
 */
export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}
