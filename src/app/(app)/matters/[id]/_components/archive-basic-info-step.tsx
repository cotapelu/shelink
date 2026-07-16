"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { CLOSED_REASON_CN } from "@/server/archive/schemas";
import type { ArchiveClosedReason } from "@prisma/client";

interface ArchiveBasicInfoStepProps {
  closedReason: ArchiveClosedReason;
  completedAt: string;
  summary: string;
  judgmentSummary: string;
  onClosedReasonChange: (value: ArchiveClosedReason) => void;
  onCompletedAtChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onJudgmentSummaryChange: (value: string) => void;
}

export function ArchiveBasicInfoStep({
  closedReason,
  completedAt,
  summary,
  judgmentSummary,
  onClosedReasonChange,
  onCompletedAtChange,
  onSummaryChange,
  onJudgmentSummaryChange
}: ArchiveBasicInfoStepProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>结案方式</Label>
          <Select value={closedReason} onValueChange={(v) => onClosedReasonChange(v as ArchiveClosedReason)}>
            <SelectTrigger><SelectValue placeholder="选择" /></SelectTrigger>
            <SelectContent>
              {Object.entries(CLOSED_REASON_CN).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>结案日期</Label>
          <Input type="date" value={completedAt} onChange={e => onCompletedAtChange(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>结案小结</Label>
        <Textarea value={summary} onChange={e => onSummaryChange(e.target.value)} placeholder="案件结果概述" rows={4} />
      </div>
      <div>
        <Label>判决/裁决摘要（可选）</Label>
        <Textarea value={judgmentSummary} onChange={e => onJudgmentSummaryChange(e.target.value)} placeholder="判决书/裁决书关键内容" rows={4} />
      </div>
    </div>
  );
}
