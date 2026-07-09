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
"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Stamp, Plus, FileText, AlertOctagon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SealRequestSheet,
} from "./seal-request-sheet";
import { SealActionsDialogs } from "./seal-actions-dialogs";
import { KpiCard } from "./kpi-card";
import { TabBtn, Count } from "./tab-btn";
import { emptySealsText } from "./seals-helpers";
import { SealRow } from "./seal-row";
import {
  type SealRequestRow,
  type SealTypeConfigRow,
  type MatterOption,
  SEAL_TYPE_CN,
  SEAL_STATUS_CN,
  SEAL_STATUS_COLOR
} from "./seal-types";

export type Tab = "allMine" | "pending" | "processed" | "toApprove" | "firm";

export function SealsView({
  mine,
  toApprove,
  all,
  configs,
  stats,
  matters,
  currentUser,
  capabilities,
  presetFromQuery
}: {
  mine: SealRequestRow[];
  toApprove: SealRequestRow[];
  all: SealRequestRow[];
  configs: SealTypeConfigRow[];
  stats: { monthStamped: number; pendingApprovalCount: number; waitingStampCount: number };
  matters: MatterOption[];
  currentUser: { id: string; role: string };
  capabilities: { canApprove: boolean; canViewFirmQueue: boolean };
  presetFromQuery: {
    draftDocId?: string;
    matterId?: string;
    documentTitle?: string;
  } | null;
}) {
  const [tab, setTab] = useState<Tab>(
    capabilities.canApprove && toApprove.length > 0 ? "toApprove" : "allMine"
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<{
    row: SealRequestRow;
    action: "detail" | "approve" | "reject" | "stamp" | "cancel";
  } | null>(null);

  // 卷宗联动：URL 带 ?new=1 自动打开新建 Sheet
  useEffect(() => {
    if (presetFromQuery?.draftDocId) {
      setSheetOpen(true);
    }
  }, [presetFromQuery]);

  const minePending = useMemo(() => mine.filter((r) => r.status === "PENDING"), [mine]);
  const mineProcessed = useMemo(
    () => mine.filter((r) => r.status === "APPROVED" || r.status === "STAMPED" || r.status === "REJECTED"),
    [mine]
  );
  const approvableIds = useMemo(() => new Set(toApprove.map((r) => r.id)), [toApprove]);
  const firmTabLabel = currentUser.role === "FINANCE" ? "财务章审批" : "全所审批";
  const rows =
    tab === "allMine"
      ? mine
      : tab === "pending"
        ? minePending
        : tab === "processed"
          ? mineProcessed
          : tab === "toApprove"
            ? toApprove
            : all;

  return (
    <div className="space-y-5">
      {/* 标题区 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">审批 · 用章</h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            未来可扩展文书内审等其他审批类型
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          新建用章申请
        </Button>
      </div>

      {/* KPI 顶部 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="本月已盖章"
          value={stats.monthStamped}
          accent="rgb(22 163 74)"
        />
        <KpiCard
          icon={<AlertOctagon className="h-3.5 w-3.5" />}
          label="待审批"
          value={stats.pendingApprovalCount}
          accent="rgb(180 130 0)"
        />
        <KpiCard
          icon={<Stamp className="h-3.5 w-3.5" />}
          label="待盖章"
          value={stats.waitingStampCount}
          accent="rgb(37 99 235)"
        />
      </div>

      {/* Tab */}
      <div className="border-b border-border">
        <div className="flex gap-5">
          <TabBtn active={tab === "allMine"} onClick={() => setTab("allMine")}>
            我的申请
            <Count n={mine.length} />
          </TabBtn>
          <TabBtn active={tab === "pending"} onClick={() => setTab("pending")}>
            待审批
            <Count n={minePending.length} hot={minePending.length > 0} />
          </TabBtn>
          <TabBtn active={tab === "processed"} onClick={() => setTab("processed")}>
            已审批
            <Count n={mineProcessed.length} />
          </TabBtn>
          {capabilities.canApprove && (
            <TabBtn active={tab === "toApprove"} onClick={() => setTab("toApprove")}>
              待我审批
              <Count n={toApprove.length} hot={toApprove.length > 0} />
            </TabBtn>
          )}
          {capabilities.canViewFirmQueue && (
            <TabBtn active={tab === "firm"} onClick={() => setTab("firm")}>
              {firmTabLabel}
              <Count n={all.length} />
            </TabBtn>
          )}
        </div>
      </div>

      {/* 表格 */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {rows.length === 0 ? (
          <div className="ll-surface rounded-lg p-12 text-center text-sm text-muted-foreground">
            <FileText className="mx-auto mb-2 h-6 w-6 opacity-40" />
            {emptySealsText(tab, firmTabLabel)}
          </div>
        ) : (
          <div className="ll-surface overflow-hidden rounded-lg">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-normal">流水号</th>
                  <th className="px-3 py-2 text-left font-normal">章种类</th>
                  <th className="px-3 py-2 text-left font-normal">申请人</th>
                  <th className="px-3 py-2 text-left font-normal">关联案件</th>
                  <th className="px-3 py-2 text-left font-normal">用章事由</th>
                  <th className="px-3 py-2 text-left font-normal">状态</th>
                  <th className="px-3 py-2 text-left font-normal">提交时间</th>
                  <th className="px-3 py-2 text-right font-normal">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <SealRow
                    key={r.id}
                    row={r}
                    currentUser={currentUser}
                    canApprove={approvableIds.has(r.id)}
                    onAction={(action) => setActionTarget({ row: r, action })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <SealRequestSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        configs={configs}
        matters={matters}
        preset={presetFromQuery}
      />

      {actionTarget && (
        <SealActionsDialogs
          target={actionTarget}
          onClose={() => setActionTarget(null)}
        />
      )}
    </div>
  );
}

