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
"use client";

import type { IntakeStatus, ConflictSeverity } from "@prisma/client";
import {
  matterCategoryLabel,
  matterCategoryColor,
  matterCategoryShort,
  intakeStatusLabel
} from "@/lib/enums";
import { CaseListCard, CaseListHeader } from "./matters-table";

export type IntakeRow = {
  id: string;
  title: string;
  category: keyof typeof matterCategoryLabel;
  status: IntakeStatus;
  receivedAt: Date;
  client: { id: string; name: string } | null;
  cause: { id: string; name: string } | null;
  conflictChecks: { id: string; conclusion: string; hits: { severity: ConflictSeverity }[] }[];
  parties: { name: string }[];
  matter: { id: string; internalCode: string } | null;
  claimAmount?: number | null;
  ownerName?: string | null;
};

/**
 * v0.17: 待审批 / 待补正 收案列表 — 复用 MattersTable 的 CaseListCard 保证视觉一致
 */
export function IntakesTable({
  items,
  kind = "intake"
}: {
  items: IntakeRow[];
  kind?: "intake" | "revision";
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-card py-20 text-center">
        <div className="text-base text-muted-foreground">
          {kind === "revision" ? "暂无待补正收案" : "暂无待审批收案"}
        </div>
        <div className="text-xs text-muted-foreground/70">
          {kind === "revision"
            ? "在 待审批 中拒绝的收案，可补正材料后重新提交，会出现在这里"
            : (
              <>
                点击右上角 <span className="text-foreground/80">新建收案</span> 开始
              </>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="ll-surface overflow-hidden rounded-lg">
      <CaseListHeader />
      <ul>
        {items.map((it) => {
          const statusLabel =
            kind === "revision" ? "待补正" : intakeStatusLabel[it.status] ?? it.status;
          const dot =
            kind === "revision"
              ? "#f97316" // orange
              : it.status === "PENDING_CONFIRMATION"
                ? "#f59e0b" // amber
                : "#10b981"; // emerald
          return (
            <CaseListCard
              key={it.id}
              href={`/intakes/${it.id}`}
              title={it.title}
              accent={matterCategoryColor[it.category]}
              status={{ label: statusLabel, dot }}
              categoryShort={matterCategoryShort[it.category]}
              intakeDate={it.receivedAt}
              claimAmount={it.claimAmount ?? null}
              inTable
            />
          );
        })}
      </ul>
    </div>
  );
}
