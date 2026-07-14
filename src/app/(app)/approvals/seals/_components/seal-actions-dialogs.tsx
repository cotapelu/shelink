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

import { useState, useTransition } from "react";
import { Loader2, Paperclip, FileText } from "lucide-react";
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
  rejectSealRequest,
  stampSealRequest,
  cancelSealRequest
} from "@/server/seals/actions";

import { type SealRequestRow, SEAL_STATUS_CN, SEAL_TYPE_CN } from "./seal-types";
import { ApprovalDialog } from "./approval-dialog";
import { SealDetailFields } from "./seal-detail-fields";

type Action = "detail" | "approve" | "reject" | "stamp" | "cancel";

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function SealActionsDialogs({
  target,
  onClose
}: {
  target: { row: SealRequestRow; action: Action };
  onClose: () => void;
}) {
  const { row, action } = target;

  if (action === "detail") {
    return <SealDetailDialog row={row} onClose={onClose} />;
  }
  if (action === "approve" || action === "reject") {
    return <ApprovalDialog row={row} action={action} onClose={onClose} />;
  }
  if (action === "stamp") {
    return <StampDialog row={row} onClose={onClose} />;
  }
  return <CancelDialog row={row} onClose={onClose} />;
}

function SealDetailDialog({ row, onClose }: { row: SealRequestRow; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] w-[92vw] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>用章申请详情</DialogTitle>
        </DialogHeader>
        <SealDetailFields row={row} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StampDialog({ row, onClose }: { row: SealRequestRow; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!file) {
      toast.error("请上传盖章后扫描件");
      return;
    }
    if (!isPdfFile(file)) {
      toast.error("需上传 pdf 格式文件");
      return;
    }
    const fd = new FormData();
    fd.set("id", row.id);
    fd.set("stampedDoc", file);
    startTransition(async () => {
      try {
        await stampSealRequest(fd);
        toast.success("已完成");
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "提交失败");
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>回填盖章后扫描件</DialogTitle>
        </DialogHeader>
        <p className="text-[12px] text-muted-foreground">
          {row.code} · {SEAL_TYPE_CN[row.sealType]} · {row.documentTitle}
        </p>
        <label className="mt-3 flex cursor-pointer items-center gap-2 rounded border border-dashed border-border px-3 py-4 text-[12px] text-muted-foreground hover:bg-muted/30">
          <Paperclip className="h-3.5 w-3.5" />
          {file ? (
            <span className="flex items-center gap-1 text-foreground">
              <FileText className="h-3 w-3" />
              {file.name}
            </span>
          ) : (
            "选择 PDF 文件"
          )}
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const picked = e.target.files?.[0] ?? null;
              if (picked && !isPdfFile(picked)) {
                toast.error("需上传 pdf 格式文件");
                e.target.value = "";
                setFile(null);
                return;
              }
              setFile(picked);
            }}
          />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={submit} disabled={pending || !file}>
            {pending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({ row, onClose }: { row: SealRequestRow; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const submit = () => startTransition(async () => {
    try {
      await cancelSealRequest({ id: row.id });
      toast.success("已撤销");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "撤销失败");
    }
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>撤销用章申请</DialogTitle></DialogHeader>
        <p className="text-[12px] text-muted-foreground">确定撤销 {row.code} ？</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="destructive" onClick={submit} disabled={pending}>{pending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}确定撤销</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <p className="flex min-w-0 items-baseline gap-2 text-[11px]">
      <span className="w-16 shrink-0 text-muted-foreground">{k}</span>
      <span className={mono ? "min-w-0 break-words font-mono text-foreground" : "min-w-0 break-words text-foreground"}>
        {v}
      </span>
    </p>
  );
}

function DocumentLink({ label, docId, name }: { label: string; docId: string; name: string }) {
  return (
    <a
      href={`/api/documents/${docId}/download`}
      target="_blank"
      rel="noreferrer"
      className="flex min-w-0 items-start gap-2 text-[11px] text-primary hover:underline"
      title={name}
    >
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <span className="inline-flex min-w-0 items-start gap-1">
        <FileText className="mt-0.5 h-3 w-3 shrink-0" />
        <span className="min-w-0 truncate">{name}</span>
      </span>
    </a>
  );
}
