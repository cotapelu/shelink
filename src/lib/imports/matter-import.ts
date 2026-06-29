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
 * v0.42 批F（项6）案件批量导入 —— 纯逻辑（无 DB / 无 exceljs 依赖，便于单测）。
 * 列定义、文本→枚举映射、标题生成、首程序推断、单行结构校验都在这里；
 * 律师邮箱 / 案由的 DB 查找放在 server/imports/actions.ts。
 */
import type { MatterCategory, MatterStatus, ClientType, PartyType, ProcedureType } from "@prisma/client";

import { matterCategoryLabel, matterStatusLabel } from "@/lib/enums";

/** 导入列定义（key = 内部字段，header = Excel 表头） */
export interface ImportColumn {
  key: string;
  header: string;
  required: boolean;
  hint?: string;
}

export const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "clientName", header: "Tên khách hàng", required: true },
  { key: "clientIdNumber", header: "Số căn cước khách hàng", required: true, hint: "CMND / Mã số thuế" },
  { key: "clientType", header: "Loại khách hàng", required: false, hint: "Cá nhân / Công ty, mặc định cá nhân" },
  { key: "opposingName", header: "Tên đối phương", required: true },
  { key: "opposingIdNumber", header: "Số căn cước đối phương", required: true },
  { key: "opposingType", header: "Loại đối phương", required: false, hint: "Cá nhân / Công ty, mặc định cá nhân" },
  { key: "category", header: "Loại vụ án", required: true, hint: Object.values(matterCategoryLabel).join(" / ") },
  { key: "status", header: "Trạng thái vụ án", required: true, hint: "Đang xử lý / Đã kết thúc / Đã lưu trữ" },
  { key: "ownerEmail", header: "Email luật sư phụ trách", required: false, hint: "Tìm theo email; để trống thì gán cho người import" },
  { key: "intakeDate", header: "Ngày nhận vụ án", required: false, hint: "YYYY-MM-DD" },
  { key: "cause", header: "Vụ án", required: false, hint: "Tìm trong database; nếu không có dùng text free" },
  { key: "claimAmount", header: "Giá trị yêu cầu", required: false, hint: "Số, đơn vị VNĐ" },
  { key: "clientPhone", header: "Số điện thoại", required: false },
  { key: "jurisdiction", header: "Có thẩm quyền", required: false }
];

export type RawRow = Record<string, string>;

export interface NormalizedRow {
  clientName: string;
  clientIdNumber: string;
  clientType: ClientType;
  clientPhone: string | null;
  opposingName: string;
  opposingIdNumber: string;
  opposingPartyType: PartyType;
  clientPartyType: PartyType;
  category: MatterCategory;
  status: MatterStatus;
  ownerEmail: string | null;
  intakeDate: Date | null;
  causeText: string | null;
  claimAmount: number | null;
  jurisdiction: string | null;
}

/** 文本反查案件类型（按 matterCategoryLabel） */
export function parseCategoryLabel(text: string): MatterCategory | null {
  const t = text.trim();
  for (const [key, label] of Object.entries(matterCategoryLabel)) {
    if (label === t) return key as MatterCategory;
  }
  return null;
}

/** 文本反查案件状态（兼容「结案」/「已结案」/「Kết thúc」=「Đã kết thúc」） */
export function parseStatusLabel(text: string): MatterStatus | null {
  const t = text.trim();
  if (t === "结案" || t === "已结案" || t === "Kết thúc") return "CLOSED";
  for (const [key, label] of Object.entries(matterStatusLabel)) {
    if (label === t) return key as MatterStatus;
  }
  return null;
}

/** 个人 / 企业 → ClientType（默认个人） */
export function parseClientType(text: string | undefined): ClientType {
  const t = (text ?? "").trim();
  if (t === "Công ty" || t === "企业" || t === "公司" || t === "单位") return "COMPANY";
  return "INDIVIDUAL";
}

/** 个人 / 企业 → PartyType（默认自然人） */
export function parsePartyType(text: string | undefined): PartyType {
  const t = (text ?? "").trim();
  if (t === "Công ty" || t === "企业" || t === "公司" || t === "单位") return "COMPANY";
  return "NATURAL_PERSON";
}

/** 收案日期解析：接受 YYYY-MM-DD / YYYY/MM/DD（已由调用方把 Excel 日期格式化为字符串） */
export function parseImportDate(text: string | undefined): Date | null {
  const t = (text ?? "").trim();
  if (!t) return null;
  const m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** 标的额解析：去掉逗号/￥/元，转数字 */
export function parseAmount(text: string | undefined): number | null {
  const t = (text ?? "").trim().replace(/[,¥￥\s元]/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** 案件标题：`客户 与 相对方 案由`（无重复空格） */
export function buildMatterTitle(clientName: string, opposingName: string, cause: string | null): string {
  const base = `${clientName.trim()} 与 ${opposingName.trim()}`;
  const c = (cause ?? "").trim();
  return c ? `${base} ${c}` : base;
}

/** 首程序类型：与收案转化（convertIntakeToMatter）一致的推断 */
export function firstProcedureTypeFor(category: MatterCategory): ProcedureType {
  return category === "CIVIL_COMMERCIAL" ||
    category === "CRIMINAL" ||
    category === "ADMINISTRATIVE"
    ? ("FIRST_INSTANCE" as ProcedureType)
    : ("NON_LITIGATION_PHASE" as ProcedureType);
}

export interface RowValidation {
  errors: string[];
  normalized: NormalizedRow | null;
}

/** 单行结构校验 + 枚举/数值/日期归一化（不含 DB 查找） */
export function validateRow(raw: RawRow): RowValidation {
  const errors: string[] = [];
  const get = (k: string) => (raw[k] ?? "").trim();

  const clientName = get("clientName");
  const clientIdNumber = get("clientIdNumber");
  const opposingName = get("opposingName");
  const opposingIdNumber = get("opposingIdNumber");
  if (!clientName) errors.push("Thiếu tên khách hàng");
  if (!clientIdNumber) errors.push("Thiếu số căn cước khách hàng");
  if (!opposingName) errors.push("Thiếu tên đối phương");
  if (!opposingIdNumber) errors.push("Thiếu số căn cước đối phương");

  const categoryText = get("category");
  const category = parseCategoryLabel(categoryText);
  if (!categoryText) errors.push("Thiếu loại vụ án");
  else if (!category) errors.push(`Loại vụ án「${categoryText}」không nhận diện được`);

  const statusText = get("status");
  const status = parseStatusLabel(statusText);
  if (!statusText) errors.push("Thiếu trạng thái vụ án");
  else if (!status) errors.push(`Trạng thái vụ án「${statusText}」không nhận diện được (Đang xử lý/Đã kết thúc/Đã lưu trữ)`);

  const intakeText = get("intakeDate");
  let intakeDate: Date | null = null;
  if (intakeText) {
    intakeDate = parseImportDate(intakeText);
    if (!intakeDate) errors.push(`Ngày nhận vụ án「${intakeText}」định dạng phải là YYYY-MM-DD`);
  }

  const amountText = get("claimAmount");
  let claimAmount: number | null = null;
  if (amountText) {
    claimAmount = parseAmount(amountText);
    if (claimAmount === null) errors.push(`Giá trị yêu cầu「${amountText}」không phải số hợp lệ`);
  }

  if (errors.length > 0 || !category || !status) {
    return { errors, normalized: null };
  }

  const ownerEmail = get("ownerEmail") || null;
  const causeText = get("cause") || null;
  const jurisdiction = get("jurisdiction") || null;
  const clientPhone = get("clientPhone") || null;

  return {
    errors,
    normalized: {
      clientName,
      clientIdNumber,
      clientType: parseClientType(get("clientType")),
      clientPhone,
      opposingName,
      opposingIdNumber,
      opposingPartyType: parsePartyType(get("opposingType")),
      clientPartyType: parsePartyType(get("clientType")),
      category,
      status,
      ownerEmail,
      intakeDate,
      causeText,
      claimAmount,
      jurisdiction
    }
  };
}
