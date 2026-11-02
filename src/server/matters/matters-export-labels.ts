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
/**
 * Nhan + hang so dung cho export xlsx cua Matters. Thuần (khong DB) — tach tu export-xlsx.ts.
 */
import {
  MatterCategory,
  type MatterMemberRole,
  type PartyRole,
  type ProcedureEngagement,
  type ProcedureOutcome,
  type ProcedureStatus
} from "@prisma/client";
import { matterCategoryKind } from "@/lib/enums";

export type MattersExportTab = "intake" | "active" | "archived" | "revision" | "all";
type MatterSortBy = "hearing" | "intakeDate" | "claimAmount";
type MatterSortDir = "asc" | "desc";

export type MattersExportParams = {
  tab: MattersExportTab;
  search?: string;
  category?: MatterCategory;
  status?: string;
  from?: string;
  to?: string;
  sortBy: MatterSortBy;
  sortDir: MatterSortDir;
};

export type ExportUser = {
  id: string;
  role: string;
};

export const EXPORT_TABS: MattersExportTab[] = [
  "intake",
  "active",
  "archived",
  "revision",
  "all"
];

export const TAB_LABEL: Record<MattersExportTab, string> = {
  all: "Tất cả vụ án",
  intake: "Chờ duyệt",
  active: "Đang xử lý",
  revision: "Chờ bổ sung",
  archived: "Đã lưu trữ"
};

export const TAB_FILE_KEY: Record<MattersExportTab, string> = {
  all: "all",
  intake: "intake",
  active: "active",
  revision: "revision",
  archived: "archived"
};

export const MATTER_CATEGORIES = Object.values(MatterCategory) as MatterCategory[];
export type MatterCategoryKind = ReturnType<typeof matterCategoryKind>;

export const partyRoleLabel: Record<PartyRole, string> = {
  CLIENT_PARTY: "Khách hàng",
  OPPOSING_PARTY: "Đối phương",
  THIRD_PARTY: "Người thứ ba",
  CO_LITIGANT: "Cùng bên kiện",
  AGENT: "Đại diện",
  WITNESS: "Nhân chứng",
  OTHER: "Khác"
};

export const memberRoleLabel: Record<MatterMemberRole, string> = {
  LEAD: "Chủ vụ",
  CO_LEAD: "Hỗ trợ",
  ASSISTANT: "Trợ lý"
};

export const procedureStatusLabel: Record<ProcedureStatus, string> = {
  PENDING: "Chưa bắt đầu",
  IN_PROGRESS: "Đang xử lý",
  CONCLUDED: "Đã kết thúc"
};

export const procedureEngagementLabel: Record<ProcedureEngagement, string> = {
  ENGAGED: "Tham gia",
  INFORMATIONAL: "Chỉ đăng ký"
};

export const procedureOutcomeLabel: Record<ProcedureOutcome, string> = {
  WON: "Thắng kiện",
  PARTIAL_WON: "Thắng một phần",
  LOST: "Thua kiện",
  MEDIATED: "Hòa giải",
  WITHDRAWN: "Rút đơn",
  DISMISSED: "Bị bác",
  COMPLETED: "Hoàn thành",
  TRANSFERRED: "Chuyển tới",
  OTHER: "Khác"
};
