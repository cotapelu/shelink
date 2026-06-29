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
import { getSession } from "@/lib/auth/session";
import {
  listSealRequests,
  listSealTypeConfigs,
  getSealStats,
  getSealApprovalCapabilities
} from "@/server/seals/actions";
import { prisma } from "@/lib/prisma";
import { matterAssociationFilter } from "@/lib/permissions";
import { SealsView } from "./_components/seals-view";

export default async function SealsPage({
  searchParams
}: {
  searchParams?: { new?: string; draftDocId?: string; matterId?: string; documentTitle?: string };
}) {
  const session = await getSession();
  if (!session?.user) return null;

  const capabilities = await getSealApprovalCapabilities();

  const [mine, toApprove, all, configs, stats, recentMatters] = await Promise.all([
    listSealRequests({ scope: "mine" }),
    capabilities.canApprove ? listSealRequests({ scope: "approval" }) : Promise.resolve([]),
    capabilities.canViewFirmQueue ? listSealRequests({ scope: "all" }) : Promise.resolve([]),
    listSealTypeConfigs(),
    getSealStats(),
    prisma.matter.findMany({
      where: {
        deletedAt: null,
        ...matterAssociationFilter(session.user.id)
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, internalCode: true, title: true }
    })
  ]);

  // 卷宗联动：?new=1&draftDocId=...&matterId=...&documentTitle=...
  const presetFromQuery = searchParams?.new === "1"
    ? {
        draftDocId: searchParams.draftDocId,
        matterId: searchParams.matterId,
        documentTitle: searchParams.documentTitle
      }
    : null;

  return (
    <SealsView
      mine={mine}
      toApprove={toApprove}
      all={all}
      configs={configs}
      stats={stats}
      matters={recentMatters}
      currentUser={{ id: session.user.id, role: session.user.role }}
      capabilities={capabilities}
      presetFromQuery={presetFromQuery}
    />
  );
}
