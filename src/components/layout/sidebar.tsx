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
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { primaryNav, secondaryNav, type NavItem } from "./nav-config";

/** v0.42 项1: 侧栏品牌（可在设置 → 律所信息配置） */
export type FirmBrand = {
  name: string;
  subtitle: string;
  logoDataUrl: string | null;
};

/** 桌面侧边栏（md 以上显示） */
export function Sidebar({ firm }: { firm: FirmBrand }) {
  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col border-r border-border bg-sidebar md:flex">
      <NavContent firm={firm} />
    </aside>
  );
}

/** 导航内容 — 桌面侧边栏和移动 Sheet 共用 */
export function NavContent({ firm }: { firm: FirmBrand }) {
  const pathname = usePathname();

  return (
    <>
      <Link
        href="/"
        className="flex h-14 items-center gap-2.5 px-5 transition-colors hover:bg-muted/50"
        aria-label="返回工作台"
      >
        {firm.logoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={firm.logoDataUrl}
            alt={firm.name}
            className="h-8 w-8 shrink-0 rounded-md object-contain"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scale className="h-4 w-4" strokeWidth={1.8} />
          </div>
        )}
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[1.05rem] font-semibold tracking-tight">{firm.name}</span>
          {firm.subtitle ? (
            <span className="truncate text-[10px] text-muted-foreground">{firm.subtitle}</span>
          ) : null}
        </div>
      </Link>

      <div className="ll-rule mx-4" />

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-0.5">
          {primaryNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </div>
      </nav>

      <div className="ll-rule mx-4" />

      <div className="px-3 py-3">
        <div className="space-y-0.5">
          {secondaryNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </div>
      </div>
    </>
  );
}

function NavLink({
  item,
  active,
  onClick
}: {
  item: NavItem;
  active: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group relative flex h-8 items-center gap-2.5 rounded-md px-3 text-[0.82rem] transition-colors",
        active
          ? "text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-r-sm bg-primary"
        />
      )}
      <Icon
        className={cn(
          "h-[15px] w-[15px] shrink-0",
          active ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"
        )}
        strokeWidth={active ? 2 : 1.6}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span
          className={cn(
            "rounded-sm px-1.5 py-px text-[10px] font-medium tabular",
            active
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}
