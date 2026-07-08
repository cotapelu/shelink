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

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CLOSED_REASON_CN } from "@/server/archive/schemas";
import Link from "next/link";
import type { PendingRecord } from "./batch-reject-dialog";

export function DetailDialog({
  record,
  onClose,
}: {
  record: PendingRecord;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-[#9B7BF7]" />归档申请详情</DialogTitle>
          <DialogDescription><span className="font-mono text-[#9B7BF7]">{record.archiveNo}</span><span className="text-muted-foreground"> · 申请人 {record.archivedBy}</span></DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <DetailFields record={record} />
          {record.judgmentSummary && <DetailSection title="裁判结果摘要">{record.judgmentSummary}</DetailSection>}
          <DetailSection title="结案小结">{record.summary}</DetailSection>
          {record.missingItems.length > 0 && <MissingItemsSection items={record.missingItems} />}
          <LinkSection matterId={record.matter.id} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailFields({ record }: { record: PendingRecord }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
      <Field label="案件" value={`${record.matter.internalCode} · ${record.matter.title}`} />
      <Field label="委托方" value={record.matter.primaryClient?.name ?? "—"} />
      <Field
        label="结案方式"
        value={
          record.closedReason
            ? CLOSED_REASON_CN[record.closedReason as keyof typeof CLOSED_REASON_CN]
            : "—"
        }
      />
      <Field
        label="结案日期"
        value={record.completedAt ? record.completedAt.toISOString().slice(0, 10) : "—"}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-medium mb-1">{title}</div>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}

function MissingItemsSection({ items }: { items: string[] }) {
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
      <div className="text-xs font-medium text-amber-700 mb-1">缺项材料（{items.length}）</div>
      <div className="text-xs text-amber-700/80 break-all">{items.join("、")}</div>
    </div>
  );
}

function LinkSection({ matterId }: { matterId: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <Link href={`/matters/${matterId}`} target="_blank" className="text-xs text-[#5B8DEF] hover:underline">
        → 打开案件详情查看完整材料与卷宗
      </Link>
    </div>
  );
}
