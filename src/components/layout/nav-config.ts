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
  UsersRound,
  Kanban,
  GitBranch,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

// v0.4: 一级菜单收紧 —— 收案合并到案件、利益冲突进顶栏、材料只在案件详情
// v0.8.1: 用章统一收口到"审批"（未来可扩文书内审等其他审批类型）
// v0.9.3: 加"快递"
// v0.11: 隐藏"收件箱"（短信解析使用率低，代码与路由保留以便恢复）
// v0.37: 快递/工具/服务中心 移入顶栏「应用」菜单，不再占侧边
// v0.45: 暂时隐藏"保全"一级入口，代码与路由保留以便恢复
export const primaryNav: NavItem[] = [
  { label: "工作台", href: "/", icon: LayoutDashboard },
  { label: "案件", href: "/matters", icon: FolderOpen },
  { label: "客户", href: "/clients", icon: Users },
  { label: "财务", href: "/finance", icon: Wallet },
  { label: "日程", href: "/schedule", icon: Calendar },
  { label: "审批", href: "/approvals/seals", icon: ClipboardCheck }
];

export const secondaryNav: NavItem[] = [
  { label: "归档", href: "/archive", icon: Archive },
  { label: "报表", href: "/reports", icon: BarChart3 },
  // Genealogy domain
  { label: "Giáo Phả", href: "/genealogy", icon: UsersRound },
  // ERP domain
  { label: "ERP", href: "/erp", icon: Kanban },
  { label: "设置", href: "/settings", icon: Settings }
];
