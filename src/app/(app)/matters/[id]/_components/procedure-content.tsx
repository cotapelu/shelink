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

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  AlertTriangle,
  Plus,
  Gavel,
  Check,
  Trash2,
  Loader2,
  StickyNote,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ScanLine,
  ScanText
} from "lucide-react";
import type {
  Deadline,
  Hearing,
  MatterStage,
  MatterProcedure,
  ProcedureMemo
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn, daysUntil } from "@/lib/utils";
import { procedureTypeLabel } from "@/lib/enums";
import {
  addDeadline,
  addHearing,
  toggleDeadlineCompleted,
  deleteDeadline,
  deleteHearing,
  addProcedureMemo,
  deleteProcedureMemo
} from "@/server/procedures/actions";
import type { DeadlineCreateInput } from "@/server/procedures/schemas";
import { createExpress, deleteExpress } from "@/server/express/actions";
import { parseExpressLabel } from "@/server/ai/parse-express";
import { parseSummons } from "@/server/ai/parse-summons";
import type { ExpressItem } from "./info-extras";

type ProcedureWithChildren = MatterProcedure & {
  deadlines: Deadline[];
  hearings: Hearing[];
  stages: MatterStage[];
  memos: ProcedureMemo[];
};

// Kiểu dòng sau khi gộp, kèm nhãn thủ tục
type HearingRowItem = Hearing & { procLabel: string };
type DeadlineRowItem = Deadline & { procLabel: string };
type MemoRowItem = ProcedureMemo & { procLabel: string };
type ImportantFilter = "hearing" | "deadline" | "express" | "memo";

const procLabelOf = (p: MatterProcedure) =>
  p.customLabel ?? procedureTypeLabel[p.type];

/**
 * v0.46：「Quan trọng」gộp toàn vụ (lịch xét xử + thời hạn quan trọng + bản ghi chuyển phát + ghi chú khác).
 */
export function ProcedureRemindersAndMemos({
  matterId,
  procedures,
  currentProcedureId,
  expresses,
  canManage
}: {
  matterId: string;
  procedures: ProcedureWithChildren[];
  currentProcedureId: string;
  expresses: ExpressItem[];
  canManage: boolean;
}) {
  const multiProc = procedures.length > 1;
  const procOptions = procedures.map((p) => ({ id: p.id, label: procLabelOf(p) }));

  const hearings: HearingRowItem[] = procedures.flatMap((p) =>
    p.hearings.map((h) => ({ ...h, procLabel: procLabelOf(p) }))
  );
  const deadlines: DeadlineRowItem[] = procedures.flatMap((p) =>
    p.deadlines.map((d) => ({ ...d, procLabel: procLabelOf(p) }))
  );
  const memos: MemoRowItem[] = procedures
    .flatMap((p) => p.memos.map((m) => ({ ...m, procLabel: procLabelOf(p) })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <ImportantItemsCard
      matterId={matterId}
      deadlines={deadlines}
      hearings={hearings}
      expresses={expresses}
      memos={memos}
      procedures={procOptions}
      defaultProcedureId={currentProcedureId}
      hearingCounts={Object.fromEntries(procedures.map((p) => [p.id, p.hearings.length]))}
      proceduresDetail={Object.fromEntries(
        procedures.map((p) => [
          p.id,
          { handlingAgency: p.handlingAgency, panel: p.panel, jurisdiction: p.jurisdiction }
        ])
      )}
      multiProc={multiProc}
      canManage={canManage}
    />
  );
}

// ============ Quan trọng (hiển thị thống nhất 4 loại)============

function ImportantItemsCard({
  matterId,
  deadlines,
  hearings,
  expresses,
  memos,
  procedures,
  defaultProcedureId,
  hearingCounts,
  proceduresDetail,
  multiProc,
  canManage
}: {
  matterId: string;
  deadlines: DeadlineRowItem[];
  hearings: HearingRowItem[];
  expresses: ExpressItem[];
  memos: MemoRowItem[];
  procedures: { id: string; label: string }[];
  defaultProcedureId: string;
  hearingCounts: Record<string, number>;
  proceduresDetail: Record<string, { handlingAgency?: string | null; panel?: string | null; jurisdiction?: string | null }>;
  multiProc: boolean;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<ImportantFilter>("hearing");
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<ImportantFilter>("hearing");

  function handleToggle(id: string) {
    startTransition(async () => {
      try {
        await toggleDeadlineCompleted(id);
      } catch {
        toast.error("Thao tác thất bại");
      }
    });
  }

  function handleDeleteDeadline(id: string) {
    if (!confirm("Xóa thời hạn này?")) return;
    startTransition(async () => {
      try {
        await deleteDeadline(id);
        toast.success("Đã xóa");
      } catch {
        toast.error("Xóa thất bại");
      }
    });
  }

  function handleDeleteHearing(id: string) {
    if (!confirm("Xóa biên bản xét xử này?")) return;
    startTransition(async () => {
      try {
        await deleteHearing(id);
        toast.success("Đã xóa");
      } catch {
        toast.error("Xóa thất bại");
      }
    });
  }

  function handleDeleteExpress(id: string) {
    if (!confirm("Xóa biên bản chuyển phát này?")) return;
    startTransition(async () => {
      try {
        await deleteExpress({ id });
        toast.success("Đã xóa");
      } catch {
        toast.error("Xóa thất bại");
      }
    });
  }

  function handleDeleteMemo(id: string) {
    startTransition(async () => {
      try {
        await deleteProcedureMemo(id);
      } catch {
        toast.error("Xóa thất bại");
      }
    });
  }

  const total = hearings.length + deadlines.length + expresses.length + memos.length;
  const filters: { value: ImportantFilter; label: string; count: number }[] = [
    { value: "hearing", label: "Xét xử", count: hearings.length },
    { value: "deadline", label: "Thời hạn", count: deadlines.length },
    { value: "express", label: "Chuyển phát", count: expresses.length },
    { value: "memo", label: "Ghi chú", count: memos.length }
  ];

  const currentCount = filters.find((f) => f.value === filter)?.count ?? 0;
  const currentLabel = filters.find((f) => f.value === filter)?.label ?? "Quan trọng";

  function openAddDialog() {
    setAddType(filter);
    setAddOpen(true);
  }

  return (
    <section className="flex h-full flex-col rounded-lg border border-border bg-card">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[13px] font-medium">
            <AlertTriangle className="h-3.5 w-3.5 text-[#FBBF24]" />
            Quan trọng
            <span className="ml-1 font-mono text-[11px] text-muted-foreground tabular">
              {total}
            </span>
          </span>
          {/* Nhóm nút phân loại */}
          <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-border bg-background p-0.5">
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] transition-colors",
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
                <span className="ml-1 font-mono text-[10px] tabular opacity-75">
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>
        {canManage && (
          <Button
            size="sm"
            onClick={openAddDialog}
            className="h-6 gap-0.5 px-2 text-[11px]"
          >
            <Plus className="h-2.5 w-2.5" />
            Thêm
          </Button>
        )}
      </header>

      {currentCount === 0 ? (
        <p className="flex flex-1 items-center justify-center px-4 py-6 text-center text-xs text-muted-foreground">
          Chưa có {currentLabel}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto px-4 py-2">
          {filter === "hearing" &&
            hearings.map((h) => (
              <HearingRow
                key={h.id}
                h={h}
                multiProc={multiProc}
                onDelete={() => handleDeleteHearing(h.id)}
                canManage={canManage}
              />
            ))}
          {filter === "deadline" &&
            deadlines.map((d) => (
              <DeadlineRow
                key={d.id}
                d={d}
                multiProc={multiProc}
                onToggle={() => handleToggle(d.id)}
                onDelete={() => handleDeleteDeadline(d.id)}
                pending={isPending}
                canManage={canManage}
              />
            ))}
          {filter === "express" &&
            expresses.map((e) => (
              <ExpressRow
                key={e.id}
                item={e}
                onDelete={() => handleDeleteExpress(e.id)}
                canManage={canManage}
              />
            ))}
          {filter === "memo" &&
            memos.map((m) => (
              <MemoRow
                key={m.id}
                memo={m}
                multiProc={multiProc}
                onDelete={() => handleDeleteMemo(m.id)}
                canManage={canManage}
              />
            ))}
        </ul>
      )}

      {canManage && (
        <ImportantItemDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          matterId={matterId}
          defaultType={addType}
          procedures={procedures}
          defaultProcedureId={defaultProcedureId}
          hearingCounts={hearingCounts}
          proceduresDetail={proceduresDetail}
        />
      )}
    </section>
  );
}

// Huy hiệu nhãn thủ tục (chỉ hiện khi nhiều thủ tục, đánh dấu dòng thuộc thủ tục nào)
function ProcTag({ label }: { label: string }) {
  return (
    <Badge
      variant="outline"
      className="shrink-0 border-border bg-muted/40 px-1 text-[9px] font-normal text-muted-foreground"
    >
      {label}
    </Badge>
  );
}

function DeadlineRow({
  d,
  multiProc,
  onToggle,
  onDelete,
  pending,
  canManage
}: {
  d: DeadlineRowItem;
  multiProc: boolean;
  onToggle: () => void;
  onDelete: () => void;
  pending: boolean;
  canManage: boolean;
}) {
  const days = daysUntil(d.dueAt);
  const isOverdue = !d.completed && days < 0;
  const isWarn = !d.completed && days <= d.remindDays && days >= 0;
  return (
    <li
      className={cn(
        "group flex items-center gap-3 py-2 text-xs transition-colors",
        d.completed && "opacity-50"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={pending || !canManage}
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
          d.completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input hover:border-primary"
        )}
        aria-label={d.completed ? "Đánh dấu chưa hoàn thành" : "Đánh dấu hoàn thành"}
      >
        {d.completed && <Check className="h-2.5 w-2.5" />}
      </button>

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "truncate text-[12.5px] font-medium",
              d.completed && "line-through text-muted-foreground"
            )}
          >
            {d.title}
          </span>
          <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[9px]">
            {deadlineCategoryLabel[d.category]}
          </Badge>
          {multiProc && <ProcTag label={d.procLabel} />}
        </div>
        {d.basis && (
          <div className="mt-0.5 text-[11px] text-muted-foreground">{d.basis}</div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 text-right">
        <div className="font-mono text-xs tabular">
          {d.completed ? (
            "Đã hoàn thành"
          ) : isOverdue ? (
            <span className="text-destructive">Quá hạn {-days}d</span>
          ) : days === 0 ? (
            <span className="text-[#FBBF24]">Hôm nay</span>
          ) : isWarn ? (
            <span className="text-[#FBBF24]">{days}d</span>
          ) : (
            <span>{days}d</span>
          )}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground tabular">
          {new Date(d.dueAt).toLocaleDateString("zh-CN")}
        </div>
      </div>

      {canManage && (
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Xóa"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      )}
    </li>
  );
}

function HearingRow({
  h,
  multiProc,
  onDelete,
  canManage
}: {
  h: HearingRowItem;
  multiProc: boolean;
  onDelete: () => void;
  canManage: boolean;
}) {
  const upcoming = new Date(h.startsAt) > new Date();
  return (
    <li className="group flex items-center gap-3 py-2 text-xs">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Calendar className="h-3.5 w-3.5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[12.5px] font-medium">{h.title}</span>
          {multiProc && <ProcTag label={h.procLabel} />}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {h.room || h.address || h.judge
            ? [h.room, h.address, h.judge].filter(Boolean).join(" · ")
            : "Chưa điền thông tin tòa án"}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        <Badge variant="outline" className="h-5 px-1.5 text-[9px]">
          {upcoming ? "Chưa diễn ra" : "Đã diễn ra"}
        </Badge>
        <span className="font-mono text-[10px] tabular text-muted-foreground">
          {new Date(h.startsAt).toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
          })}
        </span>
      </div>
      {canManage && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
        </button>
      )}
    </li>
  );
}

function ExpressRow({
  item,
  onDelete,
  canManage
}: {
  item: ExpressItem;
  onDelete: () => void;
  canManage: boolean;
}) {
  const isOutbound = item.direction === "OUTBOUND";
  return (
    <li className="group flex items-center gap-3 py-2 text-xs">
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          isOutbound
            ? "bg-orange-500/10 text-orange-600"
            : "bg-emerald-500/10 text-emerald-600"
        )}
      >
        {isOutbound ? (
          <ArrowUpFromLine className="h-3.5 w-3.5" strokeWidth={1.8} />
        ) : (
          <ArrowDownToLine className="h-3.5 w-3.5" strokeWidth={1.8} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[12.5px] font-medium">{item.purpose}</span>
          <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[9px]">
            {isOutbound ? "Gửi đi" : "Nhận"}
          </Badge>
        </div>
        <div className="mt-0.5 truncate font-mono text-[11px] tabular text-muted-foreground">
          {item.companyCode ?? "Chờ nhận dạng"} · {item.trackingNo}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        <div className="max-w-[96px] truncate text-[11px] text-foreground/80">
          {item.lastState ?? "Chờ theo dõi"}
        </div>
        <div className="font-mono text-[10px] tabular text-muted-foreground">
          {item.lastUpdateAt
            ? new Date(item.lastUpdateAt).toLocaleDateString("zh-CN")
            : new Date(item.createdAt).toLocaleDateString("zh-CN")}
        </div>
      </div>
      {canManage && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Xóa"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      )}
    </li>
  );
}

function MemoRow({
  memo,
  multiProc,
  onDelete,
  canManage
}: {
  memo: MemoRowItem;
  multiProc: boolean;
  onDelete: () => void;
  canManage: boolean;
}) {
  return (
    <li className="group flex items-start gap-3 py-2 text-xs">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <StickyNote className="h-3.5 w-3.5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="whitespace-pre-wrap break-words text-[12.5px] leading-relaxed">
          {memo.content}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {multiProc && <ProcTag label={memo.procLabel} />}
          <span className="font-mono tabular">
            {new Date(memo.createdAt).toLocaleDateString("zh-CN")}
          </span>
        </div>
      </div>
      {canManage && (
        <button
          type="button"
          onClick={onDelete}
          className="mt-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Xóa"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      )}
    </li>
  );
}

// ============ Thêm Quan trọng thống nhất ============

const deadlineCategoryLabel: Record<DeadlineCreateInput["category"], string> = {
  LIMITATION: "Thời hiệu khởi kiện",
  EVIDENCE: "Thời hạn chứng minh",
  APPEAL: "Thời hiệu kháng cáo",
  PERFORMANCE: "Thời hạn thực hiện",
  RESPONSE: "Thời hạn trả lời",
  ENFORCEMENT: "Yêu cầu thi hành",
  ARBITRATION_SET_ASIDE: "Thời hạn xin hủy án trọng tài",
  PRESERVATION: "Thời hạn bảo toàn",
  CUSTOM: "Khác"
};

const importantTypeMeta: Record<ImportantFilter, { label: string; icon: React.ElementType }> = {
  hearing: { label: "Xét xử", icon: Gavel },
  deadline: { label: "Thời hạn", icon: AlertTriangle },
  express: { label: "Chuyển phát", icon: Package },
  memo: { label: "Ghi chú", icon: StickyNote }
};

const CN_NUM: Record<number, string> = {
  1: "1",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10"
};

function toDateInput(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function toDateTimeInput(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function ImportantItemDialog({
  open,
  onOpenChange,
  matterId,
  defaultType,
  procedures,
  defaultProcedureId,
  hearingCounts,
  proceduresDetail
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
  defaultType: ImportantFilter;
  procedures: { id: string; label: string }[];
  defaultProcedureId: string;
  hearingCounts: Record<string, number>;
  proceduresDetail: Record<string, { handlingAgency?: string | null; panel?: string | null; jurisdiction?: string | null }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [summonsPending, startSummons] = useTransition();
  const [expressOcrPending, startExpressOcr] = useTransition();
  const summonsRef = useRef<HTMLInputElement>(null);
  const expressRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<ImportantFilter>(defaultType);
  const [hearingProcedureId, setHearingProcedureId] = useState(defaultProcedureId);
  const [hearingTitle, setHearingTitle] = useState("");
  const [hearingStartsAt, setHearingStartsAt] = useState(toDateTimeInput());
  const [hearingRoom, setHearingRoom] = useState("");
  const [hearingAddress, setHearingAddress] = useState("");
  const [hearingJudge, setHearingJudge] = useState("");
  const [hearingContact, setHearingContact] = useState("");
  const [hearingNotes, setHearingNotes] = useState("");

  const [deadlineProcedureId, setDeadlineProcedureId] = useState(defaultProcedureId);
  const [deadlineTitle, setDeadlineTitle] = useState("");
  const [deadlineCategory, setDeadlineCategory] =
    useState<DeadlineCreateInput["category"]>("CUSTOM");
  const [deadlineDueAt, setDeadlineDueAt] = useState(toDateInput());
  const [deadlineBasis, setDeadlineBasis] = useState("");
  const [deadlineRemindDays, setDeadlineRemindDays] = useState(3);

  const [trackingNo, setTrackingNo] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [direction, setDirection] = useState<"OUTBOUND" | "INBOUND">("OUTBOUND");
  const [purpose, setPurpose] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  const [memoProcedureId, setMemoProcedureId] = useState(defaultProcedureId);
  const [memoContent, setMemoContent] = useState("");

  useEffect(() => {
    if (!open) return;
    const procId = defaultProcedureId || procedures[0]?.id || "";
    const proc = procedures.find((p) => p.id === procId);
    const count = (hearingCounts[procId] ?? 0) + 1;
    const numStr = CN_NUM[count] ?? String(count);
    setType(defaultType);
    setHearingProcedureId(procId);
    setHearingTitle(proc ? `${proc.label}lần xét xử thứ ${numStr}` : "");
    setHearingStartsAt(toDateTimeInput());
    setHearingRoom("");
    setHearingAddress("");
    setHearingJudge("");
    setHearingContact("");
    setHearingNotes("");
    setDeadlineProcedureId(procId);
    setDeadlineTitle("");
    setDeadlineCategory("CUSTOM");
    setDeadlineDueAt(toDateInput());
    setDeadlineBasis("");
    setDeadlineRemindDays(3);
    setTrackingNo("");
    setCompanyCode("");
    setDirection("OUTBOUND");
    setPurpose("");
    setRecipient("");
    setRecipientPhone("");
    setMemoProcedureId(procId);
    setMemoContent("");
    if (summonsRef.current) summonsRef.current.value = "";
    if (expressRef.current) expressRef.current.value = "";
  }, [open, defaultType, defaultProcedureId, procedures, hearingCounts]);

  function autoHearingTitle(procId: string) {
    const proc = procedures.find((p) => p.id === procId);
    if (!proc) return;
    const count = (hearingCounts[procId] ?? 0) + 1;
    const numStr = CN_NUM[count] ?? String(count);
    setHearingTitle(`${proc.label}lần xét xử thứ ${numStr}`);
  }

  function handleSummonsUpload(file: File) {
    startSummons(async () => {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const result = await parseSummons(fd);
        if (result.hearingDate && result.hearingTime) {
          setHearingStartsAt(`${result.hearingDate}T${result.hearingTime}`);
        } else if (result.hearingDate) {
          setHearingStartsAt(`${result.hearingDate}T09:00`);
        }
        if (result.courtRoom) setHearingRoom(result.courtRoom);
        if (result.judge) setHearingJudge(result.judge);
        if (result.caseNumber || result.parties) {
          const parts: string[] = [];
          if (result.caseNumber) parts.push(`Số án: ${result.caseNumber}`);
          if (result.parties?.length) parts.push(`Các bên: ${result.parties.join(", ")}`);
          setHearingNotes(parts.join("\n"));
        }
        toast.success("Đã nhận diện giấy triệu tập, vui lòng kiểm tra");
      } catch (err) {
        toast.error("Nhận diện giấy triệu tập thất bại", {
          description: err instanceof Error ? err.message : "vui lòng nhập tay"
        });
      } finally {
        if (summonsRef.current) summonsRef.current.value = "";
      }
    });
  }

  function handleExpressOcr(file: File) {
    startExpressOcr(async () => {
      try {
        const fd = new FormData();
        fd.set("file", file);
        const result = await parseExpressLabel(fd);
        if (result.trackingNo) {
          setTrackingNo(result.trackingNo);
          toast.success(`Đã nhận diện mã vận đơn：${result.trackingNo}`);
        } else {
          toast.warning("Chưa nhận diện được mã vận đơn, vui lòng nhập tay");
        }
        if (result.companyCode) setCompanyCode(result.companyCode);
      } catch (err) {
        toast.error("Nhận diện thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      } finally {
        if (expressRef.current) expressRef.current.value = "";
      }
    });
  }

  function submitHearing() {
    if (!hearingProcedureId) {
      toast.error("Vui lòng chọn thủ tục trước");
      return;
    }
    if (!hearingTitle.trim()) {
      toast.error("Vui lòng nhập chủ đề phiên tòa");
      return;
    }
    const startsAt = new Date(hearingStartsAt);
    if (Number.isNaN(startsAt.getTime())) {
      toast.error("Vui lòng nhập thời gian phiên tòa hợp lệ");
      return;
    }
    startTransition(async () => {
      try {
        await addHearing({
          procedureId: hearingProcedureId,
          title: hearingTitle.trim(),
          startsAt,
          endsAt: undefined,
          room: hearingRoom.trim(),
          address: hearingAddress.trim(),
          judge: hearingJudge.trim(),
          contact: hearingContact.trim(),
          notes: hearingNotes.trim()
        });
        toast.success("Đã thêm lịch xét xử");
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error("Thêm thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  function submitDeadline() {
    if (!deadlineProcedureId) {
      toast.error("Vui lòng chọn thủ tục trước");
      return;
    }
    if (!deadlineTitle.trim()) {
      toast.error("Vui lòng nhập tên thời hạn");
      return;
    }
    const dueAt = new Date(`${deadlineDueAt}T00:00:00`);
    if (Number.isNaN(dueAt.getTime())) {
      toast.error("Vui lòng nhập ngày đến hạn hợp lệ");
      return;
    }
    startTransition(async () => {
      try {
        await addDeadline({
          procedureId: deadlineProcedureId,
          title: deadlineTitle.trim(),
          category: deadlineCategory,
          dueAt,
          basis: deadlineBasis.trim(),
          remindDays: deadlineRemindDays
        });
        toast.success("Đã thêm thời hạn quan trọng");
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error("Thêm thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  function submitExpress() {
    if (!trackingNo.trim()) {
      toast.error("Vui lòng nhập hoặc nhận diện mã chuyển phát");
      return;
    }
    if (!purpose.trim()) {
      toast.error("Vui lòng nhập mục đích chuyển phát");
      return;
    }
    startTransition(async () => {
      try {
        await createExpress({
          trackingNo: trackingNo.trim(),
          companyCode: companyCode.trim(),
          direction,
          matterId,
          purpose: purpose.trim(),
          recipient: recipient.trim(),
          recipientPhone: recipientPhone.trim()
        });
        toast.success("Đã thêm bản ghi chuyển phát");
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error("Thêm thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  function submitMemo() {
    if (!memoProcedureId) {
      toast.error("Vui lòng chọn thủ tục trước");
      return;
    }
    if (!memoContent.trim()) {
      toast.error("Vui lòng nhập nội dung ghi chú");
      return;
    }
    startTransition(async () => {
      try {
        await addProcedureMemo({
          procedureId: memoProcedureId,
          content: memoContent.trim()
        });
        toast.success("Đã thêm ghi chú khác");
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error("Thêm thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (type === "hearing") submitHearing();
    if (type === "deadline") submitDeadline();
    if (type === "express") submitExpress();
    if (type === "memo") submitMemo();
  }

  const needsProcedure = type !== "express";
  const procedureMissing = needsProcedure && procedures.length === 0;
  const submitLabel = `Thêm${importantTypeMeta[type].label}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>ThêmQuan trọng</DialogTitle>
          <DialogDescription className="text-xs">
            Chọn loại sự kiện và nhập thông tin trong một cửa sổ
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border px-6 py-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(importantTypeMeta) as ImportantFilter[]).map((key) => {
                const Icon = importantTypeMeta[key].icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className={cn(
                      "flex h-9 items-center justify-center gap-1.5 rounded-md border px-2 text-xs transition-colors",
                      type === key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {importantTypeMeta[key].label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            {procedureMissing && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                Vui lòng thêm thủ tục vụ án trước, rồi mới nhập lịch xét xử, thời hạn quan trọng hoặc ghi chú khác.
              </div>
            )}

            {type === "hearing" && (
              <>
                <div className="flex items-center gap-2">
                  <input
                    ref={summonsRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSummonsUpload(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={summonsPending || procedureMissing}
                    onClick={() => summonsRef.current?.click()}
                  >
                    {summonsPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ScanText className="h-3.5 w-3.5" />
                    )}
                    {summonsPending ? "Đang nhận diện…" : "Tải ảnh giấy triệu tập để nhận diện"}
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    Tải ảnh giấy triệu tập, tự động điền thông tin phiên tòa
                  </span>
                </div>
                <ImportantField label="Chủ đề" required>
                  <Input
                    value={hearingTitle}
                    onChange={(e) => setHearingTitle(e.target.value)}
                    placeholder="vd: phiên tòa lần 1"
                    disabled={procedureMissing}
                  />
                </ImportantField>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ImportantField label="Thủ tục" required>
                    <ProcedureSelect
                      value={hearingProcedureId}
                      procedures={procedures}
                      disabled={procedureMissing}
                      onChange={(value) => {
                        setHearingProcedureId(value);
                        autoHearingTitle(value);
                      }}
                    />
                  </ImportantField>
                  <ImportantField label="Toà xét xử">
                    <Input
                      readOnly
                      value={proceduresDetail[hearingProcedureId]?.handlingAgency ?? "—"}
                      className="bg-muted/50 text-muted-foreground"
                    />
                  </ImportantField>
                  <ImportantField label="Thời gian xét xử" required>
                    <Input
                      type="datetime-local"
                      value={hearingStartsAt}
                      onChange={(e) => setHearingStartsAt(e.target.value)}
                      disabled={procedureMissing}
                    />
                  </ImportantField>
                  <ImportantField label="Phòng xét xử">
                    <Input
                      value={hearingRoom}
                      onChange={(e) => setHearingRoom(e.target.value)}
                      placeholder="vd: Phòng xét xử số 3"
                      disabled={procedureMissing}
                    />
                  </ImportantField>
                  <ImportantField label="Chủ tọa / Trọng tài viên">
                    <Input
                      value={hearingJudge}
                      onChange={(e) => setHearingJudge(e.target.value)}
                      disabled={procedureMissing}
                    />
                  </ImportantField>
                  <ImportantField label="Liên hệ">
                    <Input
                      value={hearingContact}
                      onChange={(e) => setHearingContact(e.target.value)}
                      placeholder="SĐT thẩm phán / thư ký"
                      disabled={procedureMissing}
                    />
                  </ImportantField>
                </div>
                <ImportantField label="Địa điểm xét xử">
                  <Input
                    value={hearingAddress}
                    onChange={(e) => setHearingAddress(e.target.value)}
                    placeholder="vd: số XX đường XX, Toà án XX"
                    disabled={procedureMissing}
                  />
                </ImportantField>
                <ImportantField label="Ghi chú">
                  <Textarea
                    rows={4}
                    value={hearingNotes}
                    onChange={(e) => setHearingNotes(e.target.value)}
                    disabled={procedureMissing}
                  />
                </ImportantField>
              </>
            )}

            {type === "deadline" && (
              <>
                <ImportantField label="Thủ tục" required>
                  <ProcedureSelect
                    value={deadlineProcedureId}
                    procedures={procedures}
                    disabled={procedureMissing}
                    onChange={setDeadlineProcedureId}
                  />
                </ImportantField>
                <ImportantField label="Tên thời hạn" required>
                  <Input
                    value={deadlineTitle}
                    onChange={(e) => setDeadlineTitle(e.target.value)}
                    placeholder="vd: hạn chứng minh / ngày hết thời hiệu kháng cáo"
                    disabled={procedureMissing}
                  />
                </ImportantField>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ImportantField label="Loại thời hạn">
                    <Select
                      value={deadlineCategory}
                      onValueChange={(value) =>
                        setDeadlineCategory(value as DeadlineCreateInput["category"])
                      }
                      disabled={procedureMissing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(deadlineCategoryLabel).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </ImportantField>
                  <ImportantField label="Ngày đến hạn" required>
                    <Input
                      type="date"
                      value={deadlineDueAt}
                      onChange={(e) => setDeadlineDueAt(e.target.value)}
                      disabled={procedureMissing}
                    />
                  </ImportantField>
                </div>
                <ImportantField label="Cơ sở tính">
                  <Input
                    value={deadlineBasis}
                    onChange={(e) => setDeadlineBasis(e.target.value)}
                    placeholder="vd: ngày nhận bản án 2026-05-01 + 15 ngày"
                    disabled={procedureMissing}
                  />
                </ImportantField>
                <ImportantField label="Nhắc trước (ngày)">
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    className="font-mono tabular"
                    value={deadlineRemindDays}
                    onChange={(e) => setDeadlineRemindDays(Number(e.target.value))}
                    disabled={procedureMissing}
                  />
                </ImportantField>
              </>
            )}

            {type === "express" && (
              <>
                <ImportantField label="Mã số" required>
                  <div className="flex gap-1">
                    <Input
                      value={trackingNo}
                      onChange={(e) => setTrackingNo(e.target.value)}
                      placeholder="Nhập tay hoặc tải ảnh để nhận diện"
                      className="font-mono"
                    />
                    <input
                      ref={expressRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleExpressOcr(file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => expressRef.current?.click()}
                      disabled={expressOcrPending}
                      className="h-9 shrink-0 gap-1"
                    >
                      {expressOcrPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ScanLine className="h-3 w-3" />
                      )}
                      Nhận diện
                    </Button>
                  </div>
                </ImportantField>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ImportantField label="Hãng chuyển phát">
                    <Input
                      value={companyCode}
                      onChange={(e) => setCompanyCode(e.target.value)}
                      placeholder="Để trống sẽ tự nhận diện"
                    />
                  </ImportantField>
                  <ImportantField label="Hướng">
                    <Select
                      value={direction}
                      onValueChange={(value) => setDirection(value as "OUTBOUND" | "INBOUND")}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OUTBOUND">Gửi đi (ta → ngoài)</SelectItem>
                        <SelectItem value="INBOUND">Nhận (ngoài → ta)</SelectItem>
                      </SelectContent>
                    </Select>
                  </ImportantField>
                </div>
                <ImportantField label="Mục đích" required>
                  <Input
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="vd: gửi đơn khởi kiện về Toà án"
                  />
                </ImportantField>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ImportantField label="Người / đơn vị nhận">
                    <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} />
                  </ImportantField>
                  <ImportantField label="Điện thoại người nhận">
                    <Input
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="font-mono"
                    />
                  </ImportantField>
                </div>
              </>
            )}

            {type === "memo" && (
              <>
                <ImportantField label="Thủ tục" required>
                  <ProcedureSelect
                    value={memoProcedureId}
                    procedures={procedures}
                    disabled={procedureMissing}
                    onChange={setMemoProcedureId}
                  />
                </ImportantField>
                <ImportantField label="Nội dung ghi chú" required>
                  <Textarea
                    rows={6}
                    value={memoContent}
                    onChange={(e) => setMemoContent(e.target.value)}
                    placeholder="Nhập nội dung ghi chú..."
                    disabled={procedureMissing}
                  />
                </ImportantField>
              </>
            )}
          </div>

          <DialogFooter className="border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              disabled={isPending || summonsPending || expressOcrPending || procedureMissing}
              className="gap-1.5"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProcedureSelect({
  value,
  procedures,
  disabled,
  onChange
}: {
  value: string;
  procedures: { id: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Chọn thủ tục" />
      </SelectTrigger>
      <SelectContent>
        {procedures.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ImportantField({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-xs">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
