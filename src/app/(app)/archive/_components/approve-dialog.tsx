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
import { approveArchiveRecord } from "@/server/archive/actions";
import type { PendingRecord } from "./batch-reject-dialog";

function useApprove(record: PendingRecord, onSuccess: () => void) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        await approveArchiveRecord({
          archiveId: record.id,
          note: note.trim() || undefined,
        });
        toast.success(`已通过归档申请（${record.archiveNo}）`);
        onSuccess();
        router.refresh();
      } catch (err) {
        toast.error("审批失败", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return { note, setNote, isPending, submit };
}

function RecordInfo({ record }: { record: PendingRecord }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs">
      <div className="font-mono text-[#9B7BF7]">{record.archiveNo}</div>
      <div className="text-muted-foreground mt-0.5">
        {record.matter.internalCode} · {record.matter.title}
      </div>
    </div>
  );
}

function MissingItemsAlert({ record }: { record: PendingRecord }) {
  if (record.missingItems.length === 0) return null;
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>
        此申请有 {record.missingItems.length} 项材料缺失，请确认知悉后再通过。
      </span>
    </div>
  );
}

function NoteInput({ note, setNote }: { note: string; setNote: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">审批备注（可选）</Label>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="备注会写入归档记录与时间线，律师可见"
        rows={3}
      />
    </div>
  );
}

export function ApproveDialog({ record, onClose }: { record: PendingRecord; onClose: () => void }) {
  const { note, setNote, isPending, submit } = useApprove(record, onClose);
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Check className="h-5 w-5 text-emerald-500" />通过归档申请</DialogTitle>
          <DialogDescription>通过后案件状态变为「已归档」，全部 server action 进入只读门禁。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <RecordInfo record={record} />
          <MissingItemsAlert record={record} />
          <NoteInput note={note} setNote={setNote} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>取消</Button>
          <Button onClick={submit} disabled={isPending} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            确认通过
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
