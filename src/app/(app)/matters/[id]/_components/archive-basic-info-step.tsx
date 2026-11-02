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
          <Label>Hình thức kết thúc</Label>
          <Select value={closedReason} onValueChange={(v) => onClosedReasonChange(v as ArchiveClosedReason)}>
            <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
            <SelectContent>
              {Object.entries(CLOSED_REASON_CN).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Ngày kết thúc</Label>
          <Input type="date" value={completedAt} onChange={e => onCompletedAtChange(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Tóm tắt kết thúc</Label>
        <Textarea value={summary} onChange={e => onSummaryChange(e.target.value)} placeholder="Mô tả kết quả vụ án" rows={4} />
      </div>
      <div>
        <Label>Tóm tắt bản án/quyết định (tuỳ chọn)</Label>
        <Textarea value={judgmentSummary} onChange={e => onJudgmentSummaryChange(e.target.value)} placeholder="Nội dung then chốt của bản án/quyết định" rows={4} />
      </div>
    </div>
  );
}
