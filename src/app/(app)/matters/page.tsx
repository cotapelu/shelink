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
import { listMatters } from "@/server/matters/actions";
import { listIntakes } from "@/server/intakes/actions";
import { listClients } from "@/server/clients/actions";
import { listActiveColleagues } from "@/server/users/actions";
import { MattersView } from "./_components/matters-view";
import type { MatterCategory } from "@prisma/client";

export type MattersTab = "intake" | "active" | "archived" | "revision" | "all";
export type MatterSortBy = "hearing" | "intakeDate" | "claimAmount";
export type MatterSortDir = "asc" | "desc";

function resolveTab(input?: string): MattersTab {
  if (input === "intake" || input === "archived" || input === "revision" || input === "all") return input;
  return "active";
}

function defaultSortByForTab(tab: MattersTab): MatterSortBy {
  return tab === "active" ? "hearing" : "intakeDate";
}

function supportsSortBy(tab: MattersTab, sortBy: MatterSortBy) {
  if (sortBy === "hearing") return tab === "active" || tab === "all";
  return true;
}

function resolveSortBy(input: string | undefined, tab: MattersTab): MatterSortBy {
  const candidate =
    input === "hearing" || input === "intakeDate" || input === "claimAmount"
      ? input
      : undefined;
  if (candidate && supportsSortBy(tab, candidate)) return candidate;
  return defaultSortByForTab(tab);
}

function resolveSortDir(input?: string): MatterSortDir {
  return input === "asc" ? "asc" : "desc";
}

function resolveDateStart(input?: string) {
  return resolveDateBoundary(input, false);
}

function resolveDateEnd(input?: string) {
  return resolveDateBoundary(input, true);
}

function resolveDateBoundary(input: string | undefined, endOfDay: boolean) {
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

type Props = {
  searchParams: Promise<{
    tab?: string;
    search?: string;
    category?: MatterCategory;
    status?: string; // Lọc trạng thái dưới tab tất cả
    from?: string; // Thời gian tiếp nhận từ yyyy-mm-dd
    to?: string; // Thời gian tiếp nhận đến
    sortBy?: string;
    sortDir?: string;
    page?: string;
    new?: string;
  }>;
};

export default async function MattersPage({ searchParams }: Props) {
  const params = await searchParams;
  const tab = resolveTab(params.tab);
  const page = params.page ? Number(params.page) : 1;
  const sortBy = resolveSortBy(params.sortBy, tab);
  const sortDir = resolveSortDir(params.sortDir);
  const dateFrom = resolveDateStart(params.from);
  const dateTo = resolveDateEnd(params.to);

  // Ngăn kéo tiếp nhận cần: dropdown khách hàng + danh sách đồng nghiệp
  const [clientsResponse, colleagues] = await Promise.all([
    listClients({ pageSize: 100 }),
    listActiveColleagues()
  ]);

  if (tab === "intake" || tab === "revision") {
    // Chờ duyệt / chờ bổ sung: lọc từ bảng Intake
    const intakeSortBy = sortBy === "claimAmount" ? "claimAmount" : "intakeDate";
    const intakes = await listIntakes({
      search: params.search,
      category: params.category,
      statusIn:
        tab === "intake"
          ? ["INTAKE", "PENDING_CONFIRMATION"]
          : ["NEEDS_REVISION"],
      receivedAtFrom: dateFrom,
      receivedAtTo: dateTo,
      sortBy: intakeSortBy,
      sortDir,
      page,
      pageSize: 30
    });
    return (
      <MattersView
        tab={tab}
        intakeData={{
          items: intakes.items.map((i) => ({
            id: i.id,
            title: i.title,
            category: i.category,
            status: i.status,
            receivedAt: i.receivedAt,
            client: i.client ? { id: i.client.id, name: i.client.name } : null,
            cause: i.cause,
            parties: i.parties,
            conflictChecks: i.conflictChecks,
            matter: i.matter,
            claimAmount: i.claimAmount ? Number(i.claimAmount) : null,
            ownerName: i.ownerUser?.name ?? null
          })),
          total: intakes.total
        }}
        clientOptions={clientsResponse.items.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type
        }))}
        colleagues={colleagues}
        initialFilters={{
          search: params.search ?? "",
          category: params.category ?? "ALL",
          from: params.from,
          to: params.to,
          sortBy: intakeSortBy,
          sortDir
        }}
        autoOpenIntake={params.new === "1"}
      />
    );
  }

  // active / archived / all: tra bảng Matter
  let statusGroup: { statusIn?: ("PENDING_ACCEPTANCE" | "IN_PROGRESS" | "ON_HOLD" | "CLOSED" | "ARCHIVED")[]; statusNotIn?: ("PENDING_ACCEPTANCE" | "IN_PROGRESS" | "ON_HOLD" | "CLOSED" | "ARCHIVED")[] } = {};
  if (tab === "archived") {
    statusGroup = { statusIn: ["ARCHIVED"] };
  } else if (tab === "active") {
    statusGroup = { statusNotIn: ["CLOSED", "ARCHIVED"] };
  } else if (tab === "all") {
    // Toàn bộ vụ án: đã qua duyệt tiếp nhận (loại PENDING_ACCEPTANCE — đó là giai đoạn tiếp nhận)
    // Có thể lọc tiếp bằng searchParams.status
    if (params.status === "active") {
      statusGroup = { statusIn: ["IN_PROGRESS", "ON_HOLD"] };
    } else if (params.status === "closed") {
      statusGroup = { statusIn: ["CLOSED"] };
    } else if (params.status === "archived") {
      statusGroup = { statusIn: ["ARCHIVED"] };
    } else {
      statusGroup = { statusIn: ["IN_PROGRESS", "ON_HOLD", "CLOSED", "ARCHIVED"] };
    }
  }

  const matters = await listMatters({
    search: params.search,
    category: params.category,
    page,
    ...statusGroup,
    intakeDateFrom: dateFrom,
    intakeDateTo: dateTo,
    sortBy,
    sortDir
  });

  return (
    <MattersView
      tab={tab}
      matterData={matters}
      clientOptions={clientsResponse.items.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type
      }))}
      colleagues={colleagues}
      initialFilters={{
        search: params.search ?? "",
        category: params.category ?? "ALL",
        status: params.status,
        from: params.from,
        to: params.to,
        sortBy,
        sortDir
      }}
      autoOpenIntake={params.new === "1"}
    />
  );
}
