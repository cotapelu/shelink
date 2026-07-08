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
import { Check, AlertTriangle, Loader2 } from "lucide-react";
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
import { batchApproveArchiveRecords } from "@/server/archive/actions";
import type { PendingRecord, BatchResult } from "./batch-reject-dialog";
import { BatchResultPanel } from "./batch-reject-dialog";

function useBatchApprove(records: PendingRecord[]) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<BatchResult | null>(null);
  const recordById = new Map(records.map((r) => [r.id, r]));
  const withMissing = records.filter((r) => r.missingItems.length > 0);
  async function submit(ids?: string[]) {
    const targetIds = ids ?? records.map((r) => r.id);
    startTransition(async () => {
      try {
        const { succeeded, failed } = await batchApproveArchiveRecords({
          archiveIds: targetIds,
          note: note.trim() || undefined,
        });
        setResult({ succeeded, failed });
        if (failed.length === 0) toast.success(`已批量通过 ${succeeded.length} 条`);
        else toast.warning(`部分成功：${succeeded.length} 成功，${failed.length} 失败`);
        router.refresh();
      } catch (err) {
        toast.error("批量通过失败", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }
  return { note, setNote, isPending, result, submit, recordById, withMissing };
}

function MissingItemsAlert({ withMissing }: { withMissing: PendingRecord[] }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>
        有 {withMissing.length} 条申请存在材料缺项（
        {withMissing.slice(0, 3).map((r) => r.archiveNo).join("、")}
        {withMissing.length > 3 ? "…" : ""}）。确认知悉后再通过。
      </span>
    </div>
  );
}

function ApproveNoteInput({ note, setNote }: { note: string; setNote: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">统一审批备注（可选）</Label>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="备注会写入每条归档记录"
        rows={2}
      />
    </div>
  );
}

function ApproveActions({
  onCancel,
  onSubmit,
  isPending,
  total,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  isPending: boolean;
  total: number;
}) {
  return (
    <DialogFooter>
      <Button variant="outline" onClick={onCancel} disabled={isPending}>取消</Button>
      <Button
        onClick={onSubmit}
        disabled={isPending}
        className="bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        确认通过 {total} 条
      </Button>
    </DialogFooter>
  );
}

function ApproveForm({
  withMissing,
  note,
  setNote,
  onCancel,
  onSubmit,
  isPending,
  total,
}: {
  withMissing: PendingRecord[];
  note: string;
  setNote: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isPending: boolean;
  total: number;
}) {
  return (
    <>
      {withMissing.length > 0 && <MissingItemsAlert withMissing={withMissing} />}
      <ApproveNoteInput note={note} setNote={setNote} />
      <ApproveActions onCancel={onCancel} onSubmit={onSubmit} isPending={isPending} total={total} />
    </>
  );
}

function ResultFooter({
  result,
  isPending,
  onClose,
  onSubmit,
}: {
  result: BatchResult;
  isPending: boolean;
  onClose: (v: boolean) => void;
  onSubmit: (ids?: string[]) => void;
}) {
  return (
    <DialogFooter>
      <Button variant="outline" onClick={() => onClose(true)}>完成</Button>
      {result.failed.length > 0 && (
        <Button
          onClick={() => onSubmit(result.failed.map((f) => f.id))}
          disabled={isPending}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          重试失败的 {result.failed.length} 条
        </Button>
      )}
    </DialogFooter>
  );
}

export function BatchApproveDialog({ records, onClose }: { records: PendingRecord[]; onClose: (s: boolean) => void }) {
  const { note, setNote, isPending, result, submit, recordById, withMissing } = useBatchApprove(records);
  return (
    <Dialog open onOpenChange={o => !o && onClose(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Check className="h-5 w-5 text-emerald-500" />批量通过 {records.length} 条归档申请</DialogTitle>
          <DialogDescription>通过后涉案件全部进入「已归档」只读状态，且通知申请人。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {result === null ? (
            <ApproveForm withMissing={withMissing} note={note} setNote={setNote} onCancel={() => onClose(false)} onSubmit={submit} isPending={isPending} total={records.length} />
          ) : (
            <BatchResultPanel result={result} recordById={recordById} />
          )}
        </div>
        {result !== null && (
          <ResultFooter result={result} isPending={isPending} onClose={onClose} onSubmit={submit} />
        )}
      </DialogContent>
    </Dialog>
  );
}
