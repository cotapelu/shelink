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
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ChangePasswordForm } from "./_components/change-password-form";
import { AvatarForm } from "./_components/avatar-form";
import { userRoleLabel } from "@/lib/enums";

export default async function ProfilePage() {
  const session = await getSession();
  const user = session!.user;
  // 从 DB 读最新头像（避免 JWT 缓存导致上传后不刷新）
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatar: true }
  });

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-base font-semibold">个人信息</h2>
        <div className="mb-5">
          <AvatarForm name={user.name ?? ""} initialAvatar={dbUser?.avatar ?? null} />
        </div>
        <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <Item label="姓名">{user.name}</Item>
          <Item label="邮箱" mono>{user.email}</Item>
          <Item label="角色">{userRoleLabel[user.role as keyof typeof userRoleLabel] ?? user.role}</Item>
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-base font-semibold">修改密码</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}

function Item({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`mt-1 ${mono ? "font-mono tabular" : ""}`}>{children}</dd>
    </div>
  );
}
