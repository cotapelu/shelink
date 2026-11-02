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
 * Export xlsx danh sách Tiếp nhận / Vụ án — lớp IO (Prisma + ExcelJS).
 * Logic thuần đã tách sang: matters-export-{labels,includes,params,columns,formatters,rows-*}.
 * Không re-export từ module "use server" (bài học AUTO-63); file này không phải server-action
 * nên re-export hàm resolve params an toàn cho route + test hiện tại.
 */
import ExcelJS from "exceljs";
import { MatterCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { matterCategoryKind, matterCategoryLabel } from "@/lib/enums";
import {
  buildIntakeWhere,
  buildMatterWhere,
  groupRowsByCategory,
  intakeOrderBy,
  resolveMattersExportParams,
  sortMatterRows
} from "./matters-export-params";
import {
  TAB_LABEL,
  type ExportUser,
  type MattersExportParams,
  type MattersExportTab
} from "./matters-export-labels";
import {
  intakeInclude,
  matterInclude,
  type IntakeExportRow,
  type MatterExportRow
} from "./matters-export-includes";
import { intakeColumnsForKind, matterColumnsForKind } from "./matters-export-columns";
import { buildIntakeRow } from "./matters-export-rows-intake";
import { buildMatterRow } from "./matters-export-rows-matter";
import { buildFilename, polishSheet, sheetName } from "./matters-export-formatters";

export { resolveMattersExportParams };
export type { MattersExportParams, MattersExportTab };

// --- IO: truy vấn DB ---

async function fetchIntakeRows(params: MattersExportParams, user: ExportUser): Promise<IntakeExportRow[]> {
  return prisma.intake.findMany({
    where: buildIntakeWhere(params, user),
    orderBy: intakeOrderBy(params),
    include: intakeInclude
  });
}

async function fetchMatterRows(params: MattersExportParams, user: ExportUser): Promise<MatterExportRow[]> {
  return prisma.matter.findMany({
    where: buildMatterWhere(params, user),
    orderBy: [{ updatedAt: "desc" }],
    include: matterInclude
  });
}

async function loadUserNameMap(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, string>();
  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, name: true }
  });
  return new Map(users.map((user) => [user.id, user.name]));
}

// --- IO: ghi sheet ---

function writeEmptySheet(wb: ExcelJS.Workbook, tabLabel: string) {
  const sheet = wb.addWorksheet("Không có dữ liệu");
  sheet.columns = intakeColumnsForKind("litigation");
  polishSheet(sheet, ["money", "feeAmount"]);
  return tabLabel;
}

function writeIntakeGroupSheet(
  wb: ExcelJS.Workbook,
  tabLabel: string,
  category: MatterCategory,
  rows: IntakeExportRow[],
  coUserNames: Map<string, string>
) {
  const sheet = wb.addWorksheet(
    sheetName(`${tabLabel}-${matterCategoryLabel[category]}`)
  );
  sheet.columns = intakeColumnsForKind(matterCategoryKind(category));
  for (const intake of rows) {
    sheet.addRow(buildIntakeRow(intake, coUserNames));
  }
  polishSheet(sheet, ["money", "feeAmount"]);
}

async function writeIntakeSheets(
  wb: ExcelJS.Workbook,
  params: MattersExportParams,
  rows: IntakeExportRow[]
) {
  const coUserNames = await loadUserNameMap(rows.flatMap((row) => row.coUserIds));
  const groups = groupRowsByCategory(rows, params.category);
  if (groups.length === 0) {
    writeEmptySheet(wb, TAB_LABEL[params.tab as MattersExportTab]);
    return 0;
  }
  for (const group of groups) {
    writeIntakeGroupSheet(wb, TAB_LABEL[params.tab as MattersExportTab], group.category, group.rows, coUserNames);
  }
  return rows.length;
}

function maxProceduresOf(rows: MatterExportRow[], kind: "litigation" | "project" | "counsel") {
  if (kind !== "litigation") return 0;
  return Math.max(1, rows.reduce((max, row) => Math.max(max, row.procedures.length), 0));
}

function writeMatterGroupSheet(
  wb: ExcelJS.Workbook,
  category: MatterCategory,
  rows: MatterExportRow[],
  coUserNames: Map<string, string>
) {
  const kind = matterCategoryKind(category);
  const maxProcedures = maxProceduresOf(rows, kind);
  const sheet = wb.addWorksheet(sheetName(matterCategoryLabel[category]));
  sheet.columns = matterColumnsForKind(kind, maxProcedures);
  for (const matter of rows) {
    sheet.addRow(buildMatterRow(matter, maxProcedures, coUserNames));
  }
  polishSheet(sheet, ["claimAmount", "sourceClaimAmount", "sourceFeeAmount"]);
}

async function addIntakesSheet(wb: ExcelJS.Workbook, params: MattersExportParams, user: ExportUser) {
  const rows = await fetchIntakeRows(params, user);
  return writeIntakeSheets(wb, params, rows);
}

async function addMattersSheet(wb: ExcelJS.Workbook, params: MattersExportParams, user: ExportUser) {
  const rows = sortMatterRows(await fetchMatterRows(params, user), params);
  const coUserNames = await loadUserNameMap(rows.flatMap((row) => row.intake?.coUserIds ?? []));
  return writeMatterSheetsWithNames(wb, params, rows, coUserNames);
}

function writeMatterSheetsWithNames(
  wb: ExcelJS.Workbook,
  params: MattersExportParams,
  rows: MatterExportRow[],
  coUserNames: Map<string, string>
) {
  const groups = groupRowsByCategory(rows, params.category);
  if (groups.length === 0) {
    const sheet = wb.addWorksheet("Không có dữ liệu");
    sheet.columns = matterColumnsForKind("litigation", 1);
    polishSheet(sheet, ["claimAmount", "sourceClaimAmount", "sourceFeeAmount"]);
    return 0;
  }
  for (const group of groups) {
    writeMatterGroupSheet(wb, group.category, group.rows, coUserNames);
  }
  return rows.length;
}

// --- API công khai (giữ nguyên hợp đồng cho route + test) ---

export async function buildMattersExportWorkbook(
  params: MattersExportParams,
  user: ExportUser
): Promise<{ buffer: Buffer; filename: string; total: number; tabLabel: string }> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "LawLink";
  wb.created = new Date();
  const isIntakeTab = params.tab === "intake" || params.tab === "revision";
  const total = isIntakeTab ? await addIntakesSheet(wb, params, user) : await addMattersSheet(wb, params, user);
  const raw = await wb.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(raw),
    filename: buildFilename(params.tab),
    total,
    tabLabel: TAB_LABEL[params.tab as MattersExportTab]
  };
}
