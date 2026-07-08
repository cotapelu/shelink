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

import Link from "next/link";
import { useState } from "react";
import { FileText, User, Calendar, Check, X } from "lucide-react";
import { CLOSED_REASON_CN } from "@/server/archive/schemas";
import type { PendingRecord } from "./batch-reject-dialog";
import { BatchRejectDialog } from "./batch-reject-dialog";
import { BatchApproveDialog } from "./batch-approve-dialog";
import { ApproveDialog } from "./approve-dialog";
import { RejectDialog } from "./reject-dialog";
import { DetailDialog } from "./detail-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const CATEGORY_CN: Record<string, string> = { CIVIL_COMMERCIAL: "民商", CRIMINAL: "刑事", ADMINISTRATIVE: "行政", NON_LITIGATION: "非诉", LEGAL_COUNSEL: "顾问", SPECIAL_PROJECT: "专项" };

function useSelection(records: PendingRecord[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allChecked = records.length > 0 && selected.size === records.length;
  const indeterminate = selected.size > 0 && !allChecked;
  const selectedRecords = records.filter((r) => selected.has(r.id));
  function toggleAll() { if (allChecked) setSelected(new Set()); else setSelected(new Set(records.map((r) => r.id))); }
  function toggleOne(id: string) { setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function clear() { setSelected(new Set()); }
  return { selected, allChecked, indeterminate, selectedRecords, toggleAll, toggleOne, clear };
}

function ArchiveToolbar({ selectedSize, total, onClear, onApprove, onReject }: { selectedSize: number; total: number; onClear: () => void; onApprove: () => void; onReject: () => void }) {
  return (
    <div className="mb-2 flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
      <span>已选 <span className="font-mono font-medium">{selectedSize}</span> / <span className="font-mono text-muted-foreground">{total}</span></span>
      <div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={onClear}>取消选择</Button><Button size="sm" onClick={onApprove} className="bg-emerald-600 text-white hover:bg-emerald-700"><Check className="mr-1 h-3.5 w-3.5" />批量通过</Button><Button size="sm" variant="destructive" onClick={onReject}><X className="mr-1 h-3.5 w-3.5" />批量驳回</Button></div>
    </div>
  );
}

function ArchiveRow({ rec, selected, onToggle, onDetail, onApprove, onReject }: { rec: PendingRecord; selected: boolean; onToggle: () => void; onDetail: () => void; onApprove: () => void; onReject: () => void }) {
  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-3 py-2.5"><Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`选择 ${rec.archiveNo}`} /></td>
      <td className="px-3 py-2.5 font-mono text-xs text-[#9B7BF7]">{rec.matter.firmCaseNo ?? "—"}</td>
      <td className="px-3 py-2.5"><Link href={`/matters/${rec.matter.id}`} className="hover:text-[#5B8DEF] transition-colors line-clamp-1"><FileText className="h-3 w-3 inline mr-1 text-muted-foreground" />{rec.matter.title}</Link></td>
      <td className="px-3 py-2.5 text-xs">{CATEGORY_CN[rec.matter.category] ?? rec.matter.category}</td>
      <td className="px-3 py-2.5 text-xs"><User className="h-3 w-3 inline mr-1 text-muted-foreground" />{rec.matter.primaryClient?.name ?? "—"}</td>
      <td className="px-3 py-2.5 text-xs">{rec.closedReason ? CLOSED_REASON_CN[rec.closedReason as keyof typeof CLOSED_REASON_CN] : "—"}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground"><Calendar className="h-3 w-3 inline mr-1" />{rec.archivedAt.toISOString().slice(0, 10)}</td>
      <td className="px-3 py-2.5 text-xs">{rec.archivedBy}</td>
      <td className="px-3 py-2.5">{rec.missingItems.length > 0 ? <Badge variant="outline" className="border-amber-500/40 text-amber-500 text-[10px]">{rec.missingItems.length} 项</Badge> : <span className="text-xs text-muted-foreground">齐</span>}</td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button type="button" onClick={onDetail} className="text-xs text-muted-foreground hover:text-foreground">查看</button>
          <span className="text-muted-foreground/40">·</span>
          <button type="button" onClick={onApprove} className="inline-flex items-center gap-0.5 text-xs text-emerald-600 hover:text-emerald-500"><Check className="h-3 w-3" />通过</button>
          <span className="text-muted-foreground/40">·</span>
          <button type="button" onClick={onReject} className="inline-flex items-center gap-0.5 text-xs text-destructive hover:text-destructive/80"><X className="h-3 w-3" />驳回</button>
        </div>
      </td>
    </tr>
  );
}

function ArchiveTable({ records, selected, onToggleAll, onToggleOne, onRowDetail, onRowApprove, onRowReject }: { records: PendingRecord[]; selected: Set<string>; onToggleAll: () => void; onToggleOne: (id: string) => void; onRowDetail: (rec: PendingRecord) => void; onRowApprove: (rec: PendingRecord) => void; onRowReject: (rec: PendingRecord) => void }) {
  const allChecked = records.length > 0 && selected.size === records.length;
  const indeterminate = selected.size > 0 && !allChecked;
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 w-8"><Checkbox checked={allChecked ? true : indeterminate ? "indeterminate" : false} onCheckedChange={onToggleAll} aria-label="全选" /></th>
            <th className="px-3 py-2 text-left font-normal w-32">所内案号</th>
            <th className="px-3 py-2 text-left font-normal">案件</th>
            <th className="px-3 py-2 text-left font-normal w-20">类别</th>
            <th className="px-3 py-2 text-left font-normal w-24">委托方</th>
            <th className="px-3 py-2 text-left font-normal w-20">结案方式</th>
            <th className="px-3 py-2 text-left font-normal w-28">提交时间</th>
            <th className="px-3 py-2 text-left font-normal w-20">申请人</th>
            <th className="px-3 py-2 text-left font-normal w-16">缺项</th>
            <th className="px-3 py-2 text-right font-normal w-44">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {records.map((rec) => <ArchiveRow key={rec.id} rec={rec} selected={selected.has(rec.id)} onToggle={() => onToggleOne(rec.id)} onDetail={() => onRowDetail(rec)} onApprove={() => onRowApprove(rec)} onReject={() => onRowReject(rec)} />)}
        </tbody>
      </table>
    </div>
  );
}

export function PendingArchiveTable({ records }: { records: PendingRecord[] }) {
  const [dialog, setDialog] = useState<{ type: "approve" | "reject" | "detail"; record: PendingRecord } | null>(null);
  const [batchAction, setBatchAction] = useState<"approve" | "reject" | null>(null);
  const { selected, selectedRecords, toggleAll, toggleOne, clear } = useSelection(records);
  if (records.length === 0) return <div className="rounded-lg border border-dashed border-border/60 py-16 text-center text-sm text-muted-foreground">当前没有待审批归档申请。律师提交归档后会出现在这里。</div>;
  return (
    <>
      {selected.size > 0 && <ArchiveToolbar selectedSize={selected.size} total={records.length} onClear={clear} onApprove={() => setBatchAction("approve")} onReject={() => setBatchAction("reject")} />}
      <ArchiveTable records={records} selected={selected} onToggleAll={toggleAll} onToggleOne={toggleOne} onRowDetail={(rec)=>setDialog({type:"detail",record:rec})} onRowApprove={(rec)=>setDialog({type:"approve",record:rec})} onRowReject={(rec)=>setDialog({type:"reject",record:rec})} />
      {dialog?.type === "approve" && <ApproveDialog record={dialog.record} onClose={() => setDialog(null)} />}
      {dialog?.type === "reject" && <RejectDialog record={dialog.record} onClose={() => setDialog(null)} />}
      {dialog?.type === "detail" && <DetailDialog record={dialog.record} onClose={() => setDialog(null)} />}
      {batchAction === "approve" && <BatchApproveDialog records={selectedRecords} onClose={(s)=>{ setBatchAction(null); if(s) clear(); }} />}
      {batchAction === "reject" && <BatchRejectDialog records={selectedRecords} onClose={(s)=>{ setBatchAction(null); if(s) clear(); }} />}
    </>
  );
}
