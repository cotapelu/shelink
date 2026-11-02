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
 * Giai tham so export + where/order/sort. Thuần (khong DB) — tach tu export-xlsx.ts.
 */
import { Prisma, type MatterCategory } from "@prisma/client";
import { intakeVisibilityFilter, matterVisibilityFilter } from "@/lib/permissions";
import { cleanDateText, cleanText, resolveDateBoundary } from "./matters-export-formatters";
import { EXPORT_TABS, MATTER_CATEGORIES, type MattersExportParams, type MattersExportTab, type ExportUser } from "./matters-export-labels";
import type { MatterExportRow } from "./matters-export-includes";

type MatterSortBy = MattersExportParams["sortBy"];

function parseTab(raw: string | null): MattersExportTab {
  return EXPORT_TABS.includes(raw as MattersExportTab) ? (raw as MattersExportTab) : "active";
}

function parseSortBy(raw: string | null): MatterSortBy | undefined {
  return raw === "hearing" || raw === "intakeDate" || raw === "claimAmount" ? raw : undefined;
}

function parseCategory(raw: string | null): MatterCategory | undefined {
  return MATTER_CATEGORIES.includes(raw as MatterCategory) ? (raw as MatterCategory) : undefined;
}

export function resolveMattersExportParams(searchParams: URLSearchParams): MattersExportParams {
  const tab = parseTab(searchParams.get("tab"));
  const candidateSortBy = parseSortBy(searchParams.get("sortBy"));
  const sortBy = normalizeSortByForTab(tab, candidateSortBy ?? defaultSortByForTab(tab));

  return {
    tab,
    search: cleanText(searchParams.get("search")),
    category: parseCategory(searchParams.get("category")),
    status: cleanText(searchParams.get("status")),
    from: cleanDateText(searchParams.get("from")),
    to: cleanDateText(searchParams.get("to")),
    sortBy,
    sortDir: searchParams.get("sortDir") === "asc" ? "asc" : "desc"
  };
}

function defaultSortByForTab(tab: MattersExportTab): MatterSortBy {
  return tab === "active" ? "hearing" : "intakeDate";
}

function normalizeSortByForTab(tab: MattersExportTab, sortBy: MatterSortBy): MatterSortBy {
  if (sortBy === "hearing" && tab !== "active" && tab !== "all") {
    return defaultSortByForTab(tab);
  }
  return sortBy;
}

export function groupRowsByCategory<T extends { category: MatterCategory }>(
  rows: T[],
  category?: MatterCategory
) {
  return MATTER_CATEGORIES
    .filter((candidate) => !category || candidate === category)
    .map((candidate) => ({
      category: candidate,
      rows: rows.filter((row) => row.category === candidate)
    }))
    .filter((group) => group.rows.length > 0);
}

function intakeSearchOr(search: string): Prisma.IntakeWhereInput {
  return {
    OR: [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { client: { name: { contains: search, mode: "insensitive" } } },
      { cause: { name: { contains: search, mode: "insensitive" } } },
      { parties: { some: { name: { contains: search, mode: "insensitive" } } } }
    ]
  };
}

export function buildIntakeWhere(params: MattersExportParams, user: ExportUser): Prisma.IntakeWhereInput {
  const parts: Prisma.IntakeWhereInput[] = [
    intakeVisibilityFilter(user.id, user.role),
    params.tab === "revision"
      ? { status: { in: ["NEEDS_REVISION"] } }
      : { status: { in: ["INTAKE", "PENDING_CONFIRMATION"] } }
  ];
  if (params.category) parts.push({ category: params.category });
  const range = dateRangeFilter(params);
  if (range && Object.keys(range).length > 0) parts.push({ receivedAt: range });
  if (params.search) parts.push(intakeSearchOr(params.search));
  return { AND: parts };
}

function dateRangeFilter(params: MattersExportParams) {
  const from = resolveDateBoundary(params.from, false);
  const to = resolveDateBoundary(params.to, true);
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {})
  };
}

function matterSearchOr(search: string): Prisma.MatterWhereInput {
  return {
    OR: [
      { title: { contains: search, mode: "insensitive" } },
      { internalCode: { contains: search, mode: "insensitive" } },
      { firmCaseNo: { contains: search, mode: "insensitive" } },
      { primaryClient: { name: { contains: search, mode: "insensitive" } } },
      { cause: { name: { contains: search, mode: "insensitive" } } },
      { parties: { some: { name: { contains: search, mode: "insensitive" } } } },
      { procedures: { some: { caseNumber: { contains: search, mode: "insensitive" } } } }
    ]
  };
}

export function buildMatterWhere(params: MattersExportParams, user: ExportUser): Prisma.MatterWhereInput {
  const parts: Prisma.MatterWhereInput[] = [
    matterVisibilityFilter(user.id, user.role),
    { deletedAt: null },
    matterStatusWhere(params)
  ];
  if (params.category) parts.push({ category: params.category });
  const range = dateRangeFilter(params);
  if (range) parts.push({ intakeDate: { ...range } });
  if (params.search) parts.push(matterSearchOr(params.search));
  return { AND: parts };
}

export function matterStatusWhere(params: MattersExportParams): Prisma.MatterWhereInput {
  if (params.tab === "archived") return { status: { in: ["ARCHIVED"] } };
  if (params.tab === "active") return { status: { notIn: ["CLOSED", "ARCHIVED"] } };
  if (params.status === "active") return { status: { in: ["IN_PROGRESS", "ON_HOLD"] } };
  if (params.status === "closed") return { status: { in: ["CLOSED"] } };
  if (params.status === "archived") return { status: { in: ["ARCHIVED"] } };
  return { status: { in: ["IN_PROGRESS", "ON_HOLD", "CLOSED", "ARCHIVED"] } };
}

export function intakeOrderBy(params: MattersExportParams): Prisma.IntakeOrderByWithRelationInput[] {
  if (params.sortBy === "claimAmount") {
    return [{ claimAmount: params.sortDir }, { receivedAt: "desc" }];
  }
  return [{ receivedAt: params.sortDir }];
}

function emptyLastCompare(
  aEmpty: boolean,
  bEmpty: boolean,
  updatedAt: { a: number; b: number }
): number | null {
  if (aEmpty && bEmpty) return updatedAt.b - updatedAt.a;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  return null;
}

function compareSortValues(a: unknown, b: unknown, direction: number): number {
  const isDate = a instanceof Date || b instanceof Date;
  const base = isDate
    ? (a as Date).getTime() - (b as Date).getTime()
    : Number(a) - Number(b);
  return base === 0 ? 0 : base * direction;
}

export function sortMatterRows(rows: MatterExportRow[], params: MattersExportParams) {
  return [...rows].sort((a, b) => {
    const aValue = matterSortValue(a, params.sortBy);
    const bValue = matterSortValue(b, params.sortBy);
    const updatedAt = { a: a.updatedAt.getTime(), b: b.updatedAt.getTime() };
    const emptyResult = emptyLastCompare(
      aValue === null || aValue === undefined,
      bValue === null || bValue === undefined,
      updatedAt
    );
    if (emptyResult !== null) return emptyResult;
    const direction = params.sortDir === "asc" ? 1 : -1;
    const sorted = compareSortValues(aValue, bValue, direction);
    return sorted !== 0 ? sorted : updatedAt.b - updatedAt.a;
  });
}

function matterSortValue(row: MatterExportRow, sortBy: MatterSortBy) {
  if (sortBy === "hearing") {
    return (
      row.procedures
        .map((procedure) => procedure.hearings[0]?.startsAt ?? null)
        .filter((date): date is Date => !!date)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
    );
  }
  if (sortBy === "claimAmount") {
    return row.claimAmount === null || row.claimAmount === undefined
      ? null
      : Number(row.claimAmount);
  }
  return row.intakeDate;
}
