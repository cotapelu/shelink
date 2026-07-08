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

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { batchRejectArchiveRecords } from "@/server/archive/actions";

export interface PendingRecord {
  id: string;
  archiveNo: string;
  summary: string;
  judgmentSummary: string | null;
  closedReason: string | null;
  completedAt: Date | null;
  archivedAt: Date;
  archivedBy: string;
  missingItems: string[];
  checklistJson: unknown;
  matter: {
    id: string;
    title: string;
    internalCode: string;
    firmCaseNo: string | null;
    category: string;
    primaryClient: { name: string } | null;
  };
}

export interface BatchResult {
  succeeded: string[];
  failed: { id: string; error: string }[];
}

/* Tiny components */

function BatchStats({ succeeded, failed }: { succeeded: number; failed: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
        <div className="text-[10px] text-emerald-700">成功</div>
        <div className="mt-0.5 font-mono text-lg text-emerald-700">{succeeded}</div>
      </div>
      <div className={`rounded border px-3 py-2 ${failed>0?"border-destructive/40 bg-destructive/10":"border-border bg-muted/30"}`}>
        <div className={`text-[10px] ${failed>0?"text-destructive":"text-muted-foreground"}`}>失败</div>
        <div className={`mt-0.5 font-mono text-lg ${failed>0?"text-destructive":"text-muted-foreground"}`}>{failed}</div>
      </div>
    </div>
  );
}

function FailedList({ failed, recordById }: { failed: {id:string,error:string}[]; recordById: Map<string,PendingRecord> }) {
  return (
    <div className="rounded border border-border bg-card">
      <div className="border-b border-border px-2 py-1.5 text-[10px] text-muted-foreground">失败条目</div>
      <ul className="max-h-40 divide-y divide-border overflow-y-auto">
        {failed.map((f) => {
          const rec = recordById.get(f.id);
          return (
            <li key={f.id} className="px-2 py-1.5">
              <div className="font-mono text-[#9B7BF7]">{rec?.archiveNo ?? f.id}</div>
              <div className="mt-0.5 text-destructive">{f.error}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function BatchResultPanel({ result, recordById }: { result: BatchResult; recordById: Map<string,PendingRecord> }) {
  return (
    <div className="space-y-3 text-xs">
      <BatchStats succeeded={result.succeeded.length} failed={result.failed.length} />
      {result.failed.length>0 && <FailedList failed={result.failed} recordById={recordById} />}
    </div>
  );
}

function RecordList({ records }: { records: PendingRecord[] }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs">
      <div className="text-muted-foreground mb-1">本次驳回：</div>
      <div className="space-y-0.5 max-h-32 overflow-y-auto">
        {records.map((r) => (
          <div key={r.id} className="font-mono text-[#9B7BF7]">
            {r.archiveNo}
            <span className="ml-2 text-muted-foreground">{r.matter.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RejectNoteInput({ note, setNote }: { note: string; setNote: (v:string)=>void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        统一驳回原因 <span className="text-destructive">*</span>
      </Label>
      <Textarea
        value={note}
        onChange={(e)=>setNote(e.target.value)}
        placeholder="如：本批结案小结普遍过于简略，请补充裁判要旨与办案心得后重新提交"
        rows={4}
      />
    </div>
  );
}

function BatchDialogFooter({ result, isPending, onClose, onSubmit }: { result: BatchResult; isPending: boolean; onClose: (v:boolean)=>void; onSubmit: (ids?:string[])=>void }) {
  return (
    <DialogFooter>
      <Button variant="outline" onClick={()=>onClose(true)}>完成</Button>
      {result.failed.length>0 && (
        <Button variant="destructive" onClick={()=>onSubmit(result.failed.map(f=>f.id))} disabled={isPending}>
          {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          重试失败的 {result.failed.length} 条
        </Button>
      )}
    </DialogFooter>
  );
}

function BatchRejectForm({ records, note, setNote, onCancel, onSubmit, isPending }: { records: PendingRecord[]; note: string; setNote: (v:string)=>void; onCancel: ()=>void; onSubmit: ()=>void; isPending: boolean }) {
  return (
    <>
      <RecordList records={records} />
      <RejectNoteInput note={note} setNote={setNote} />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isPending}>取消</Button>
        <Button variant="destructive" onClick={onSubmit} disabled={isPending}>
          {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          确认驳回 {records.length} 条
        </Button>
      </DialogFooter>
    </>
  );
}

function useBatchReject(records: PendingRecord[]) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<BatchResult | null>(null);
  const recordById = new Map(records.map((r) => [r.id, r]));

  async function submit(ids?: string[]) {
    const trimmed = note.trim();
    if (!trimmed) return toast.warning("请填写驳回原因（将统一应用到所选记录）");
    const targetIds = ids ?? records.map((r) => r.id);
    startTransition(async () => {
      try {
        const { succeeded, failed } = await batchRejectArchiveRecords({ archiveIds: targetIds, note: trimmed });
        setResult({ succeeded, failed });
        if (failed.length === 0) toast.success(`已批量驳回 ${succeeded.length} 条`);
        else toast.warning(`部分成功：${succeeded.length} 成功，${failed.length} 失败`);
        router.refresh();
      } catch (err) {
        toast.error("批量驳回失败", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return { note, setNote, isPending, result, submit, recordById };
}

/* Main dialog */

export function BatchRejectDialog({ records, onClose }: { records: PendingRecord[]; onClose: (s:boolean)=>void }) {
  const { note, setNote, isPending, result, submit, recordById } = useBatchReject(records);
  return (
    <Dialog open onOpenChange={o=>!o&&onClose(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><X className="h-5 w-5 text-destructive" />批量驳回 {records.length} 条归档申请</DialogTitle>
          <DialogDescription>驳回原因将统一发送给每条申请的提交律师。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {result===null ? (
            <BatchRejectForm records={records} note={note} setNote={setNote} onCancel={()=>onClose(false)} onSubmit={submit} isPending={isPending} />
          ) : (
            <BatchResultPanel result={result} recordById={recordById} />
          )}
        </div>
        {result!==null && <BatchDialogFooter result={result} isPending={isPending} onClose={onClose} onSubmit={submit} />}
      </DialogContent>
    </Dialog>
  );
}
