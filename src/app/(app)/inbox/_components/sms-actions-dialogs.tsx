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
import { Loader2, Gavel, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioChips } from "@/components/ui/radio-chips";
import { generateHearingFromSms, generateDeadlineFromSms } from "@/server/sms/actions";
import type { SmsRow, MatterOption, ParsedJson } from "./sms-types";
import { toDate } from "@/lib/sms-parser";
import { procedureTypeLabel } from "@/lib/enums";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tạo Hearing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function GenerateHearingDialog({
  open,
  onOpenChange,
  sms,
  matter
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sms: SmsRow;
  matter: NonNullable<SmsRow["matchedMatter"]>;
}) {
  const parsed = sms.parsedJson as unknown as ParsedJson;
  const [procedureId, setProcedureId] = useState(matter.procedures[0]?.id ?? "");
  const [title, setTitle] = useState(parsed.smsType === "HEARING_NOTICE" ? "phiên tòa" : "xét xử");
  const initDate = parsed.hearingDate ? toDate(parsed.hearingDate) : null;
  const [dateStr, setDateStr] = useState(
    initDate ? formatLocal(initDate) : ""
  );
  const [room, setRoom] = useState(parsed.courtRoom ?? "");
  const [judge, setJudge] = useState(parsed.judge ?? "");
  const [notes, setNotes] = useState(parsed.summary);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!procedureId) {
      toast.error("Vui lòng chọn thủ tục");
      return;
    }
    const d = dateStr ? new Date(dateStr) : null;
    if (!d || isNaN(d.getTime())) {
      toast.error("Vui lòng nhập thời gian mở phiên tòa hợp lệ");
      return;
    }
    startTransition(async () => {
      try {
        await generateHearingFromSms({
          smsId: sms.id,
          procedureId,
          title: title.trim() || "xét xử",
          startsAt: d,
          room: room.trim(),
          judge: judge.trim(),
          notes: notes.trim()
        });
        toast.success("Đã tạo phiên tòa và đánh dấu SMS này đã xử lý");
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Thất bại");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[92vw] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-primary" />
            Tạo phiên tòa · {matter.internalCode} {matter.title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label className="text-[11px]">Thủ tục liên quan *</Label>
            <RadioChips
              size="sm"
              className="mt-2"
              items={matter.procedures.map((p) => ({
                value: p.id,
                label: `${p.customLabel ?? procedureTypeLabel[p.type]}${p.caseNumber ? ` · ${p.caseNumber}` : ""}`
              }))}
              value={procedureId}
              onChange={setProcedureId}
            />
          </div>

          <div>
            <Label className="text-[11px]">Tiêu đề *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="phiên tòa / xét xử phúc thẩm / hỏi ý kiến"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-[11px]">Thời gian mở phiên tòa *</Label>
            <Input
              type="datetime-local"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-[11px]">Phòng xét xử</Label>
            <Input value={room} onChange={(e) => setRoom(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label className="text-[11px]">Thẩm phán chủ trì</Label>
            <Input value={judge} onChange={(e) => setJudge(e.target.value)} className="mt-1" />
          </div>

          <div className="md:col-span-2">
            <Label className="text-[11px]">Ghi chú</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 text-[12px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Tạo phiên tòa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tạo Deadline
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DEADLINE_CATEGORIES = [
  { value: "APPEAL", label: "Thời hiệu kháng cáo" },
  { value: "EVIDENCE", label: "Thời hạn chứng minh" },
  { value: "RESPONSE", label: "Thời hạn trả lời" },
  { value: "PERFORMANCE", label: "Thời hạn thực hiện" },
  { value: "ENFORCEMENT", label: "Thời hạn thi hành" },
  { value: "LIMITATION", label: "Thời hiệu khởi kiện" },
  { value: "ARBITRATION_SET_ASIDE", label: "Thời hạn xin hủy án trọng tài" },
  { value: "CUSTOM", label: "Khác" }
] as const;
type DeadlineCategory = (typeof DEADLINE_CATEGORIES)[number]["value"];

function pickDefaultDeadlineTitle(parsed: ParsedJson): { title: string; category: DeadlineCategory } {
  if (parsed.appealDeadline) return { title: `Thời hiệu kháng cáo ${parsed.appealDeadline}`, category: "APPEAL" };
  if (parsed.smsType === "EVIDENCE_SUBMIT") return { title: "Thời hạn chứng minh", category: "EVIDENCE" };
  if (parsed.smsType === "FEE_NOTICE") return { title: "Nộp phý tố tụng", category: "PERFORMANCE" };
  if (parsed.smsType === "JUDGMENT_NOTICE") return { title: "Bản án có hiệu lực / Thời hạn thực hiện", category: "PERFORMANCE" };
  return { title: parsed.summary.slice(0, 30) || "Thời hạn", category: "CUSTOM" };
}

function pickDefaultDueDate(parsed: ParsedJson): Date | null {
  // Thời hiệu kháng cáo: mặc định từ ngày tuyên án + N ngày; nếu không có ngày tuyên án thì để trống
  if (parsed.appealDeadline && parsed.judgmentDate) {
    const base = toDate(parsed.judgmentDate);
    const days = parseInt(parsed.appealDeadline);
    if (base && !isNaN(days)) {
      const d = new Date(base);
      d.setDate(d.getDate() + days);
      return d;
    }
  }
  // Khác: lấy ngày đầu tiên trong dates
  for (const s of parsed.dates) {
    const d = toDate(s);
    if (d) return d;
  }
  return null;
}

export function GenerateDeadlineDialog({
  open,
  onOpenChange,
  sms,
  matter
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sms: SmsRow;
  matter: NonNullable<SmsRow["matchedMatter"]>;
}) {
  const parsed = sms.parsedJson as unknown as ParsedJson;
  const defaults = pickDefaultDeadlineTitle(parsed);
  const initDue = pickDefaultDueDate(parsed);

  const [procedureId, setProcedureId] = useState(matter.procedures[0]?.id ?? "");
  const [title, setTitle] = useState(defaults.title);
  const [category, setCategory] = useState<DeadlineCategory>(defaults.category);
  const [dateStr, setDateStr] = useState(initDue ? formatLocalDateOnly(initDue) : "");
  const [basis, setBasis] = useState(parsed.summary.slice(0, 100));
  const [remindDays, setRemindDays] = useState(3);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!procedureId) {
      toast.error("Vui lòng chọn thủ tục");
      return;
    }
    const d = dateStr ? new Date(dateStr) : null;
    if (!d || isNaN(d.getTime())) {
      toast.error("Vui lòng nhập ngày đến hạn hợp lệ");
      return;
    }
    startTransition(async () => {
      try {
        await generateDeadlineFromSms({
          smsId: sms.id,
          procedureId,
          title: title.trim() || "Thời hạn",
          category,
          dueAt: d,
          basis: basis.trim(),
          remindDays
        });
        toast.success("Đã tạo thời hạn và đánh dấu SMS này đã xử lý");
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Thất bại");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[92vw] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Tạo thời hạn · {matter.internalCode} {matter.title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label className="text-[11px]">Thủ tục liên quan *</Label>
            <RadioChips
              size="sm"
              className="mt-2"
              items={matter.procedures.map((p) => ({
                value: p.id,
                label: `${p.customLabel ?? procedureTypeLabel[p.type]}${p.caseNumber ? ` · ${p.caseNumber}` : ""}`
              }))}
              value={procedureId}
              onChange={setProcedureId}
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-[11px]">Loại thời hạn *</Label>
            <RadioChips
              size="sm"
              className="mt-2"
              items={DEADLINE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              value={category}
              onChange={(v) => setCategory(v as DeadlineCategory)}
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-[11px]">Tiêu đề *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="thời hiệu kháng cáo 15 ngày / thời hạn chứng minh 30 ngày"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-[11px]">Ngày đến hạn *</Label>
            <Input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-[11px]">Nhắc trước (ngày)</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={remindDays}
              onChange={(e) => setRemindDays(Math.max(1, parseInt(e.target.value) || 3))}
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-[11px]">Cơ sở thời hạn</Label>
            <Textarea
              value={basis}
              onChange={(e) => setBasis(e.target.value)}
              rows={2}
              className="mt-1 text-[12px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Tạo thời hạn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function formatLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatLocalDateOnly(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Cho kiểu MatterCombobox hiển thị trong module này (re-export để inbox-view dùng)
export type { MatterOption };
