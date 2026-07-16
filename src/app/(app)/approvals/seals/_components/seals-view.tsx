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

import { useState, useEffect } from "react";
import {
  SealRequestSheet,
} from "./seal-request-sheet";
import { SealActionsDialogs } from "./seal-actions-dialogs";
import { SealsHeader } from "./seals-header";
import { SealsKpi } from "./seals-kpi";
import { SealsTabBar } from "./seals-tab-bar";
import { SealsTable } from "./seals-table";
import {
  type SealRequestRow,
  type SealTypeConfigRow,
  type MatterOption
} from "./seal-types";

function getInitialTab(capabilities: { canApprove: boolean }, toApprove: SealRequestRow[]): Tab {
  return capabilities.canApprove && toApprove.length > 0 ? "toApprove" : "allMine";
}

function computeRows(tab: Tab, mine: SealRequestRow[], toApprove: SealRequestRow[], all: SealRequestRow[]): SealRequestRow[] {
  if (tab === "allMine") return mine;
  if (tab === "pending") return mine.filter(r => r.status === "PENDING");
  if (tab === "processed") return mine.filter(r => ["APPROVED","STAMPED","REJECTED"].includes(r.status));
  if (tab === "toApprove") return toApprove;
  return all;
}

export type Tab = "allMine" | "pending" | "processed" | "toApprove" | "firm";

interface SealsViewProps {
  mine: SealRequestRow[];
  toApprove: SealRequestRow[];
  all: SealRequestRow[];
  configs: SealTypeConfigRow[];
  stats: { monthStamped: number; pendingApprovalCount: number; waitingStampCount: number };
  matters: MatterOption[];
  currentUser: { id: string; role: string };
  capabilities: { canApprove: boolean; canViewFirmQueue: boolean };
  presetFromQuery: { draftDocId?: string; matterId?: string; documentTitle?: string } | null;
}

export function SealsView(props: SealsViewProps) {
  const { mine, toApprove, all, configs, stats, matters, currentUser, capabilities, presetFromQuery } = props;
  const [tab, setTab] = useState<Tab>(getInitialTab(capabilities, toApprove));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<{ row: SealRequestRow; action: "detail" | "approve" | "reject" | "stamp" | "cancel" } | null>(null);
  useEffect(() => { if (presetFromQuery?.draftDocId) setSheetOpen(true); }, [presetFromQuery]);
  const rows = computeRows(tab, mine, toApprove, all);
  const firmTabLabel = currentUser.role === "FINANCE" ? "财务章审批" : "全所审批";
  return (
    <div className="space-y-5">
      <SealsHeader onNewClick={() => setSheetOpen(true)} />
      <SealsKpi monthStamped={stats.monthStamped} pendingApprovalCount={stats.pendingApprovalCount} waitingStampCount={stats.waitingStampCount} />
      <SealsTabBar tab={tab} setTab={setTab} mineCount={mine.length} pendingCount={mine.filter(r => r.status === "PENDING").length} processedCount={mine.filter(r => ["APPROVED","STAMPED","REJECTED"].includes(r.status)).length} toApproveCount={toApprove.length} allCount={all.length} canApprove={capabilities.canApprove} canViewFirmQueue={capabilities.canViewFirmQueue} firmTabLabel={firmTabLabel} />
      <SealsTable rows={rows} currentUser={currentUser} approvableIds={new Set(toApprove.map(r => r.id))} onAction={(action, row) => setActionTarget({ row, action })} tab={tab} firmTabLabel={firmTabLabel} />
      <SealRequestSheet open={sheetOpen} onOpenChange={setSheetOpen} configs={configs} matters={matters} preset={presetFromQuery} />
      {actionTarget && <SealActionsDialogs target={actionTarget} onClose={() => setActionTarget(null)} />}
    </div>
  );
}

