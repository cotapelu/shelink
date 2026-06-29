/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import Link from "next/link";
import { Settings, Users, Layers, ScrollText, KeyRound, Sparkles, Package, ListChecks, BellRing, Building2, FileUp } from "lucide-react";
import { getSession } from "@/lib/auth/session";

export default async function SettingsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const isAdmin = session?.user.role === "ADMIN";
  const isManager = isAdmin || session?.user.role === "PRINCIPAL_LAWYER";

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Settings className="h-5 w-5 text-primary" />
          设置
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <nav className="lg:col-span-1">
          <ul className="space-y-0.5 rounded-xl border border-border bg-card p-2">
            <SettingsNavLink
              href="/settings/profile"
              icon={<KeyRound className="h-3.5 w-3.5" />}
            >
              个人 / 改密码
            </SettingsNavLink>
            {isManager && (
              <>
                <SettingsNavLink
                  href="/settings/reminders"
                  icon={<BellRing className="h-3.5 w-3.5" />}
                >
                  提醒维护
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/import"
                  icon={<FileUp className="h-3.5 w-3.5" />}
                >
                  批量导入
                </SettingsNavLink>
              </>
            )}
            {isAdmin && (
              <>
                <SettingsNavLink
                  href="/settings/firm-profile"
                  icon={<Building2 className="h-3.5 w-3.5" />}
                >
                  律所信息
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/users"
                  icon={<Users className="h-3.5 w-3.5" />}
                >
                  用户管理
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/templates"
                  icon={<Layers className="h-3.5 w-3.5" />}
                >
                  阶段模板
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/custom-fields"
                  icon={<ListChecks className="h-3.5 w-3.5" />}
                >
                  自定义字段
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/ai"
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                >
                  AI 接入
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/express"
                  icon={<Package className="h-3.5 w-3.5" />}
                >
                  快递接入
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/audit"
                  icon={<ScrollText className="h-3.5 w-3.5" />}
                >
                  审计日志
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
