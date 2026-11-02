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
import Link from "next/link";
import { Settings, Users, Layers, ScrollText, KeyRound, Sparkles, Package, ListChecks, BellRing, Building2, FileUp, Wallet, Languages, Mail } from "lucide-react";
import { getSession } from "@/lib/auth/session";

export default async function SettingsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const isAdmin = session?.user.role === "ADMIN";
  const isManager = isAdmin || session?.user.role === "PRINCIPAL_LAWYER";
  const canViewCash = isManager || session?.user.role === "FINANCE";

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Settings className="h-5 w-5 text-primary" />
          Cài đặt
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <nav className="lg:col-span-1">
          <ul className="space-y-0.5 rounded-xl border border-border bg-card p-2">
            <SettingsNavLink
              href="/settings/profile"
              icon={<KeyRound className="h-3.5 w-3.5" />}
            >
              Cá nhân / Đổi mật khẩu
            </SettingsNavLink>
            {isManager && (
              <>
                <SettingsNavLink
                  href="/settings/reminders"
                  icon={<BellRing className="h-3.5 w-3.5" />}
                >
                  Bảo trì nhắc nhở
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/import"
                  icon={<FileUp className="h-3.5 w-3.5" />}
                >
                  Import hàng loạt
                </SettingsNavLink>
              </>
            )}
            {canViewCash && (
              <SettingsNavLink
                href="/settings/cash-accounts"
                icon={<Wallet className="h-3.5 w-3.5" />}
              >
                Quản lý quỹ
              </SettingsNavLink>
            )}
            {isAdmin && (
              <>
                <SettingsNavLink
                  href="/settings/firm-profile"
                  icon={<Building2 className="h-3.5 w-3.5" />}
                >
                  Thông tin văn phòng
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/users"
                  icon={<Users className="h-3.5 w-3.5" />}
                >
                  Quản lý người dùng
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/templates"
                  icon={<Layers className="h-3.5 w-3.5" />}
                >
                  Mẫu giai đoạn
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/custom-fields"
                  icon={<ListChecks className="h-3.5 w-3.5" />}
                >
                  Trường tuỳ chỉnh
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/ai"
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                >
                  Tích hợp AI
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/express"
                  icon={<Package className="h-3.5 w-3.5" />}
                >
                  Tích hợp chuyển phát
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/email"
                  icon={<Mail className="h-3.5 w-3.5" />}
                >
                  Email giao dịch
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/terminology"
                  icon={<Languages className="h-3.5 w-3.5" />}
                >
                  Thuật ngữ hiển thị
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/audit"
                  icon={<ScrollText className="h-3.5 w-3.5" />}
                >
                  Log audit
                </SettingsNavLink>
              </>
            )}
          </ul>
        </nav>

        <div className="lg:col-span-4">{children}</div>
      </div>
    </div>
  );
}

function SettingsNavLink({
  href,
  icon,
  children
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-popover hover:text-foreground"
      >
        {icon}
        {children}
      </Link>
    </li>
  );
}
