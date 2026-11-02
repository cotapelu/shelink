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
import { Sidebar, type FirmBrand } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";

export function AppShell({
  children,
  banner,
  firm,
  userAvatar
}: {
  children: React.ReactNode;
  /** v0.27: banner thông báo đầu trang (render xong phía server rồi inject) */
  banner?: React.ReactNode;
  /** v0.42 mục 1: thương hiệu sidebar (tên VP / phụ đề / Logo) */
  firm: FirmBrand;
  /** v0.43: avatar người dùng hiện tại (phía server đọc mới nhất, để thanh top hiển thị) */
  userAvatar?: string | null;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar firm={firm} />
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} firm={firm} />
      <div className="md:pl-60">
        <Topbar onMobileMenuToggle={() => setMobileNavOpen(true)} userAvatar={userAvatar ?? null} />
        {banner}
        <main className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
