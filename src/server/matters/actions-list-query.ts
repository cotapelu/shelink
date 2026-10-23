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

import { Prisma } from "@prisma/client";
import { matterVisibilityFilter } from "@/lib/permissions";
import type { MatterListQuery } from "./schemas";

export const MATTER_LIST_INCLUDE = {
  primaryClient: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true } },
  cause: { select: { id: true, name: true } },
  procedures: {
    where: { engagement: "ENGAGED" },
    orderBy: { order: "desc" },
    take: 20,
    select: {
      id: true,
      type: true,
      caseNumber: true,
      status: true,
      hearings: {
        orderBy: { startsAt: "desc" },
        take: 1,
        select: { startsAt: true }
      }
    }
  },
  // v0.8.1: Cần vài ký tự đầu của đối phương/third party cho card UI
  parties: {
    where: { role: { in: ["OPPOSING_PARTY", "THIRD_PARTY"] } },
    orderBy: [{ role: "asc" }, { ordinal: "asc" }],
    take: 3,
    select: { id: true, name: true, role: true, standing: true }
  },
  // v0.16: Có申请 lưu trữ待审批 không?
  archiveRecords: {
    where: { status: "PENDING_REVIEW" },
    take: 1,
    select: { id: true }
  },
  _count: { select: { procedures: true } }
} satisfies Prisma.MatterInclude;

function buildSimpleFilters(query: MatterListQuery): Prisma.MatterWhereInput[] {
  const parts: Prisma.MatterWhereInput[] = [];
  if (query.category) parts.push({ category: query.category });
  if (query.status) parts.push({ status: query.status });
  if (query.statusIn) parts.push({ status: { in: query.statusIn } });
  if (query.statusNotIn) parts.push({ status: { notIn: query.statusNotIn } });
  if (query.ownerId) parts.push({ ownerId: query.ownerId });
  if (query.clientId) parts.push({ primaryClientId: query.clientId });
  return parts;
}

function buildSearchFilter(query: MatterListQuery): Prisma.MatterWhereInput | null {
  if (!query.search) return null;
  return {
    OR: [
      { title: { contains: query.search, mode: "insensitive" } },
      { internalCode: { contains: query.search, mode: "insensitive" } },
      { primaryClient: { name: { contains: query.search, mode: "insensitive" } } }
    ]
  };
}

function buildDateRangeFilter(query: MatterListQuery): Prisma.MatterWhereInput | null {
  if (!query.intakeDateFrom && !query.intakeDateTo) return null;
  return {
    intakeDate: {
      ...(query.intakeDateFrom ? { gte: query.intakeDateFrom } : {}),
      ...(query.intakeDateTo ? { lte: query.intakeDateTo } : {})
    }
  };
}

export function buildMatterListWhere(
  userId: string,
  role: string,
  query: MatterListQuery
): Prisma.MatterWhereInput {
  const whereParts: Prisma.MatterWhereInput[] = [
    matterVisibilityFilter(userId, role),
    { deletedAt: null },
    ...buildSimpleFilters(query)
  ];
  const dateFilter = buildDateRangeFilter(query);
  if (dateFilter) whereParts.push(dateFilter);
  const searchFilter = buildSearchFilter(query);
  if (searchFilter) whereParts.push(searchFilter);
  return { AND: whereParts };
}

function compareNullable<T>(
  a: T | null | undefined,
  b: T | null | undefined,
  compare: (x: T, y: T) => number
) {
  const aEmpty = a === null || a === undefined;
  const bEmpty = b === null || b === undefined;
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  return compare(a as T, b as T);
}

export type MatterListItem = Prisma.MatterGetPayload<{ include: typeof MATTER_LIST_INCLUDE }> & {
  latestHearingAt: Date | null;
};

function matterSortValue(matter: MatterListItem, sortBy: MatterListQuery["sortBy"]) {
  if (sortBy === "hearing") return matter.latestHearingAt;
  if (sortBy === "claimAmount") {
    return matter.claimAmount === null || matter.claimAmount === undefined
      ? null
      : Number(matter.claimAmount);
  }
  return matter.intakeDate;
}

function sortDirection(query: MatterListQuery) {
  return query.sortDir === "asc" ? 1 : -1;
}

function compareUpdatedAt(a: MatterListItem, b: MatterListItem) {
  return b.updatedAt.getTime() - a.updatedAt.getTime();
}

export function compareMatterItems(
  a: MatterListItem,
  b: MatterListItem,
  query: MatterListQuery
) {
  const aValue = matterSortValue(a, query.sortBy);
  const bValue = matterSortValue(b, query.sortBy);
  const direction = sortDirection(query);
  const isDate = aValue instanceof Date || bValue instanceof Date;
  const cmp = isDate
    ? (x: Date | number, y: Date | number) => (x instanceof Date && y instanceof Date ? x.getTime() - y.getTime() : 0)
    : (x: Date | number, y: Date | number) => Number(x) - Number(y);
  const base = compareNullable(aValue, bValue, cmp);
  if (base === 0 && (aValue === null || aValue === undefined) && (bValue === null || bValue === undefined)) {
    return compareUpdatedAt(a, b);
  }
  return base !== 0 ? base * direction : compareUpdatedAt(a, b);
}

export function sortMatterListItems(
  items: Prisma.MatterGetPayload<{ include: typeof MATTER_LIST_INCLUDE }>[],
  query: MatterListQuery
): MatterListItem[] {
  return items
    .map((matter) => ({
      ...matter,
      latestHearingAt:
        matter.procedures
          .map((p) => p.hearings[0]?.startsAt ?? null)
          .filter((d): d is Date => !!d)
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
    }))
    .sort((a, b) => compareMatterItems(a, b, query));
}
