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
