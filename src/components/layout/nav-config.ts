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
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Wallet,
  Calendar,
  ClipboardCheck,
  Archive,
  Settings,
  BarChart3,
  FileSpreadsheet,
  FileSignature,
  Timer,
  Receipt,
  UsersRound,
  Kanban,
  Plane,
  Network,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

// v0.4: thu hẹp menu cấp 1 —— tiếp nhận gộp vào vụ án, xung đột lợi ích lên thanh top, tài liệu chỉ ở chi tiết vụ án
// v0.8.1: dùng dấu thống nhất thu về "duyệt" (tương lai mở thêm các loại duyệt khác như duyệt nội bộ văn bản)
// v0.9.3: thêm "chuyển phát"
// v0.11: ẩn "hộp thư đến" (tỷ lệ dùng phân tích tin nhắn thấp, giữ code và route để khôi phục)
// v0.37: chuyển phát/công cụ/trung tâm dịch vụ chuyển vào menu「ứng dụng」thanh top, không chiếm sidebar nữa
// v0.45: tạm ẩn cửa vào cấp 1 "bảo toàn", giữ code và route để khôi phục
export const primaryNav: NavItem[] = [
  { label: "Bảng làm việc", href: "/", icon: LayoutDashboard },
  { label: "Vụ án", href: "/matters", icon: FolderOpen },
  { label: "Báo giá", href: "/quotes", icon: FileSpreadsheet },
  { label: "Hợp đồng", href: "/contracts", icon: FileSignature },
  { label: "Ghi giờ", href: "/time-tracking", icon: Timer },
  { label: "Chi phí", href: "/expenses", icon: Receipt },
  { label: "Nghỉ phép", href: "/leave", icon: Plane },
  { label: "Khách hàng", href: "/clients", icon: Users },
  { label: "Tài chính", href: "/finance", icon: Wallet },
  { label: "Lịch", href: "/schedule", icon: Calendar },
  { label: "Duyệt", href: "/approvals/seals", icon: ClipboardCheck }
];

export const secondaryNav: NavItem[] = [
  { label: "Sơ đồ tổ chức", href: "/org-chart", icon: Network },
  { label: "Lưu trữ", href: "/archive", icon: Archive },
  { label: "Báo cáo", href: "/reports", icon: BarChart3 },
  // Genealogy domain
  { label: "Giáo Phả", href: "/genealogy", icon: UsersRound },
  // ERP domain
  { label: "ERP", href: "/erp", icon: Kanban },
  { label: "Cài đặt", href: "/settings", icon: Settings }
];
