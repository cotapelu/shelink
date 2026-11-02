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
 * Hàm định dạng + trang hoá sheet cho export xlsx Matters. THUẦN (không DB) — tách từ export-xlsx.ts (AUTO-67b).
 */
import ExcelJS from "exceljs";
import { Prisma } from "@prisma/client";
import { TAB_FILE_KEY, type MattersExportTab } from "./matters-export-labels";

export function cleanText(input: string | null) {
  const value = input?.trim();
  return value || undefined;
}

export function cleanDateText(input: string | null) {
  const value = cleanText(input);
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export function resolveDateBoundary(input: string | undefined, endOfDay: boolean) {
  if (!input) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  );
}

export function formatDate(date: Date | null | undefined) {
  if (!date) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

export function formatDateTime(date: Date | null | undefined) {
  if (!date) return "";
  return `${formatDate(date)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function decimalNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return "";
  return Number(value);
}

export function yesNo(value: boolean | null | undefined) {
  return value ? "Có" : "Không";
}

export function label<T extends string>(
  labels: Partial<Record<T, string>>,
  value: T | null | undefined
) {
  return value ? labels[value] ?? value : "";
}

export function formatJson(value: Prisma.JsonValue) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.length > 0 ? JSON.stringify(value) : "";
  if (typeof value === "object") {
    return Object.keys(value).length > 0 ? JSON.stringify(value) : "";
  }
  return String(value);
}

export function polishSheet(sheet: ExcelJS.Worksheet, moneyColumnKeys: string[]) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columnCount }
  };
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: "top", wrapText: true };
    }
  });
  const columnKeys = new Set(sheet.columns.map((column) => column.key).filter(Boolean));
  for (const key of moneyColumnKeys) {
    if (columnKeys.has(key)) {
      sheet.getColumn(key).numFmt = "#,##0.00";
    }
  }
}

export function buildFilename(tab: MattersExportTab) {
  return `lawlink-matters-${TAB_FILE_KEY[tab]}-${formatDate(new Date())}.xlsx`;
}

export function sheetName(name: string) {
  return name.replace(/[\\/:*?\[\]]/g, "").slice(0, 31) || "Sheet";
}
