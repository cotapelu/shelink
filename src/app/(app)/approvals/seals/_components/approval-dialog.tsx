/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Extracted from seal-actions-dialogs
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
 */
"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  approveSealRequest,
  rejectSealRequest
} from "@/server/seals/actions";
import { type SealRequestRow, SEAL_TYPE_CN } from "./seal-types";
import { ApprovalDialogFields } from "./approval-dialog-fields";

interface ApprovalDialogProps {
  row: SealRequestRow;
  action: "approve" | "reject";
  onClose: () => void;
}

export function ApprovalDialog({ row, action, onClose }: ApprovalDialogProps) {
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"approve" | "reject">(action);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (mode === "reject" && !note.trim()) {
      toast.error("驳回需要写明原因");
      return;
    }
    startTransition(async () => {
      try {
        if (mode === "approve") {
          await approveSealRequest({ id: row.id, note: note.trim() });
          toast.success("已批准");
        } else {
          await rejectSealRequest({ id: row.id, reason: note.trim() });
          toast.success("已驳回");
        }
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "操作失败");
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] w-[92vw] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>审批用章申请</DialogTitle>
        </DialogHeader>
        <ApprovalDialogFields row={row} />

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant={mode === "approve" ? "default" : "outline"}
            onClick={() => setMode("approve")}
            className="flex-1"
          >
            通过
          </Button>
          <Button
            size="sm"
            variant={mode === "reject" ? "destructive" : "outline"}
            onClick={() => setMode("reject")}
            className="flex-1"
          >
            驳回
          </Button>
        </div>

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={mode === "approve" ? "审批意见 (可选)" : "驳回原因 (必填)"}
          rows={2}
          className="mt-2 text-[12px]"
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
