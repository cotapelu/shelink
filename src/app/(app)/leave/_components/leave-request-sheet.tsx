"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { createLeaveRequest } from "@/server/leave/actions";
import { computeLeaveDays } from "@/server/leave/balance";
import { LEAVE_TYPE_LABEL } from "./leave-labels";

const TYPES = Object.entries(LEAVE_TYPE_LABEL);
const inputClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

function LeaveTypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
      <SelectContent>
        {TYPES.map(([key, label]) => (
          <SelectItem key={key} value={key}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
  );
}

function useLeaveForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [leaveType, setLeaveType] = useState("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const days = startDate && endDate ? computeLeaveDays(new Date(startDate), new Date(endDate)) : 0;

  const submit = (status: "DRAFT" | "SUBMITTED") => {
    if (!startDate || !endDate) {
      toast.error("Chọn khoảng ngày nghỉ");
      return;
    }
    startTransition(async () => {
      try {
        await createLeaveRequest({ leaveType, startDate, endDate, reason, status });
        toast.success(status === "DRAFT" ? "Đã lưu nháp" : "Đã gửi đơn nghỉ phép");
        setOpen(false);
        setStartDate("");
        setEndDate("");
        setReason("");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Tạo đơn thất bại");
      }
    });
  };

  return { open, setOpen, pending, leaveType, setLeaveType, startDate, setStartDate, endDate, setEndDate, reason, setReason, days, submit };
}

/** Sheet tạo đơn nghỉ phép (UI-DESIGN §7.11). */
export function LeaveRequestSheet() {
  const f = useLeaveForm();
  return (
    <Sheet open={f.open} onOpenChange={f.setOpen}>
      <Button size="sm" onClick={() => f.setOpen(true)}>Tạo đơn nghỉ phép</Button>
      <SheetContent className="max-w-2xl">
        <SheetHeader><SheetTitle>Đơn nghỉ phép mới</SheetTitle></SheetHeader>
        <div className="space-y-4 px-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Loại phép</Label>
            <LeaveTypeSelect value={f.leaveType} onChange={f.setLeaveType} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DateField label="Từ ngày" value={f.startDate} onChange={f.setStartDate} />
            <DateField label="Đến ngày" value={f.endDate} onChange={f.setEndDate} />
          </div>
          <p className="text-[12px] text-muted-foreground">
            Số ngày nghỉ: <span className="font-mono tabular-nums text-foreground">{f.days}</span> ngày
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Lý do / ghi chú</Label>
            <textarea value={f.reason} onChange={(e) => f.setReason(e.target.value)} rows={3} placeholder="Lý do nghỉ (tuỳ chọn)…" className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
          </div>
        </div>
        <SheetFooter className="flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={f.pending} onClick={() => f.submit("DRAFT")}>Lưu nháp</Button>
          <Button size="sm" disabled={f.pending} onClick={() => f.submit("SUBMITTED")}>Gửi duyệt</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
