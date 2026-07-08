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
import { rejectArchiveRecord } from "@/server/archive/actions";
import type { PendingRecord } from "./batch-reject-dialog";

function useReject(record: PendingRecord, onSuccess: () => void) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!note.trim()) {
      toast.warning("请填写驳回原因");
      return;
    }
    startTransition(async () => {
      try {
        await rejectArchiveRecord({
          archiveId: record.id,
          note: note.trim()
        });
        toast.success(`已驳回（${record.archiveNo}）`);
        onSuccess();
        router.refresh();
      } catch (err) {
        toast.error("驳回失败", {
          description: err instanceof Error ? err.message : ""
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

function NoteInput({ note, setNote }: { note: string; setNote: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        驳回原因 <span className="text-destructive">*</span>
      </Label>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="如：缺关键证据材料；办案小结过于简略；裁判文书未上传等"
        rows={4}
      />
    </div>
  );
}

export function RejectDialog({
  record,
  onClose,
}: {
  record: PendingRecord;
  onClose: () => void;
}) {
  const { note, setNote, isPending, submit } = useReject(record, onClose);
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><X className="h-5 w-5 text-destructive" />驳回归档申请</DialogTitle>
          <DialogDescription>驳回后该归档申请失效，律师需根据原因调整后重新提交。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <RecordInfo record={record} />
          <NoteInput note={note} setNote={setNote} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>取消</Button>
          <Button variant="destructive" onClick={submit} disabled={isPending}>{isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}确认驳回</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
