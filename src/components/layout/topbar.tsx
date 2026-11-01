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
import { useSession, signOut } from "next-auth/react";
import {
  Search,
  ChevronDown,
  Plus,
  LogOut,
  User,
  Settings as SettingsIcon,
  Menu,
  LayoutGrid,
  Calculator,
  Package,
  FolderArchive,
  Contact,
  Compass,
  Megaphone,
  BookText
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { NotificationPopover } from "@/components/layout/notification-popover";
import { SearchDialog } from "@/components/layout/search-dialog";
import { ToolsDialog } from "@/components/layout/tools-dialog";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  ADMIN: "Quản trị viên",
  PRINCIPAL_LAWYER: "Luật sư chủ trì",
  LAWYER: "Luật sư phụ trách",
  ASSISTANT: "Trợ lý",
  FINANCE: "Tài chính"
};

// Cửa ngò gom menu Ứng dụng（v0.38：các nhóm tách về trang riêng; Công cụ = popup toàn cục; Điều hướng pháp lý = liên kết ngoài）
// kind: "tools" mở popup công cụ (không chuyển trang); "external" mở thẻ mới; còn lại Link tới trang riêng
const APP_ITEMS = [
  { label: "Công cụ", icon: Calculator, kind: "tools" },
  { label: "Theo dõi chuyển phát", href: "/express", icon: Package, kind: "link" },
  { label: "Văn bản văn phòng", href: "/firm-resources", icon: FolderArchive, kind: "link" },
  { label: "Điều hướng pháp lý", href: "https://yesen.cn", icon: Compass, kind: "external" },
  { label: "Thông báo", href: "/announcements", icon: Megaphone, kind: "link" },
  { label: "Quy chế", href: "/policy", icon: BookText, kind: "link" },
  { label: "Danh bạ", href: "/contacts", icon: Contact, kind: "link" }
] as const;

function AppMenu({ onToolsOpen }: { onToolsOpen: (open: boolean) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cn("inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[13px]", "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground")} title="Ứng dụng">
          <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.8} />
          <span className="hidden sm:inline">Ứng dụng</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {APP_ITEMS.map((it) => (
          it.kind === "tools" ? (
            <DropdownMenuItem key={it.label} onSelect={(e) => { e.preventDefault(); onToolsOpen(true); }} className="cursor-pointer">
              <it.icon className="mr-2 h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
              {it.label}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={it.label} asChild>
              {it.kind === "external" ? (
                <a href={it.href} target="_blank" rel="noreferrer" className="cursor-pointer">
                  <it.icon className="mr-2 h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
                  {it.label}
                </a>
              ) : (
                <Link href={it.href} className="cursor-pointer">
                  <it.icon className="mr-2 h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
                  {it.label}
                </Link>
              )}
            </DropdownMenuItem>
          )
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


function UserMenu({ userAvatar, displayName, roleLabel }: { userAvatar?: string | null; displayName: string; roleLabel: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn("flex h-8 items-center gap-2 rounded-md border border-border pl-1 pr-2.5", "transition-colors hover:bg-muted")}>
          <Avatar className="h-6 w-6">
            {userAvatar && <AvatarImage src={userAvatar} alt={displayName} />}
            <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">{displayName ? displayName.charAt(0) : "?"}</AvatarFallback>
          </Avatar>
          <span className="hidden text-[13px] font-medium sm:inline">{displayName || "..."}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" strokeWidth={2} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{displayName ? `${displayName} · ${roleLabel}` : "Đang tải..."}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile" className="cursor-pointer"><User className="mr-2 h-4 w-4" />Thông tin cá nhân</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer"><SettingsIcon className="mr-2 h-4 w-4" />Cài đặt</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); signOut({ callbackUrl: "/login" }); }} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopbarRight({ setToolsOpen, router, userAvatar, displayName, roleLabel }: {
  setToolsOpen: (open: boolean) => void;
  router: any;
  userAvatar?: string | null;
  displayName: string;
  roleLabel: string;
}) {
  return (
    <>
      <div className="flex items-center gap-1.5">
        <AppMenu onToolsOpen={setToolsOpen} />
        <Button
          size="sm"
          onClick={() => router.push("/matters?tab=intake&new=1")}
          className="h-8 gap-1.5 px-3 text-[13px]"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          <span className="hidden sm:inline">Tạo tiếp nhận</span>
        </Button>
        <div className="mx-0.5 hidden h-4 w-px bg-border sm:block" />
        <NotificationPopover />
      </div>
      <UserMenu userAvatar={userAvatar} displayName={displayName} roleLabel={roleLabel} />
    </>
  );
}

export function Topbar({ onMobileMenuToggle, userAvatar }: { onMobileMenuToggle?: () => void; userAvatar?: string | null }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const user = session?.user;
  const displayName = user?.name ?? "";
  const roleLabel = user?.role ? (roleLabels[user.role] ?? user.role) : "";

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2.5 border-b border-border bg-background px-4 sm:px-6">
      {/* Menu hamburger mobile */}
      {onMobileMenuToggle && (
        <button
          onClick={onMobileMenuToggle}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          aria-label="Mở menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}
      {/* Tìm */}
      <button
        onClick={() => setSearchOpen(true)}
        className={cn(
          "flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-card px-3 text-left sm:w-48 sm:flex-initial",
          "text-sm text-muted-foreground transition-colors hover:border-input hover:text-foreground"
        )}
        aria-label="Tìm kiếm toàn cục (Cmd+K)"
      >
        <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
        <span className="flex-1 truncate">Tìm vụ án, khách hàng, tài liệu...</span>
        <kbd className="hidden h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1 hidden sm:block" />

      {/* Nhóm nút công cụ */}
      <TopbarRight setToolsOpen={setToolsOpen} router={router} userAvatar={userAvatar} displayName={displayName} roleLabel={roleLabel} />

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <ToolsDialog open={toolsOpen} onOpenChange={setToolsOpen} />
    </header>
  );
}
