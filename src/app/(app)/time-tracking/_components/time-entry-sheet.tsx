"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { createTimeEntry } from "@/server/time-entries/actions";

/** Sheet ghi giờ: giờ theo bước 0.25, gắn dự án (DATA-MODEL §4.30). */
export function TimeEntrySheet({ matters }: { matters: { id: string; label: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState("1");
  const [billable, setBillable] = useState(true);
  const [description, setDescription] = useState("");
  const [matterId, setMatterId] = useState("");

  const submit = () =>
    startTransition(async () => {
      try {
        await createTimeEntry({
          date: new Date(date),
          hours: Number(hours),
          billable,
          description: description || undefined,
          matterId
        });
        toast.success("Đã ghi giờ");
        setOpen(false);
        setHours("1");
        setDescription("");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Ghi giờ thất bại");
      }
    });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>Ghi giờ</Button>
      <SheetContent className="max-w-md">
        <SheetHeader><SheetTitle>Ghi giờ làm việc</SheetTitle></SheetHeader>
        <TimeEntryFields
          date={date} setDate={setDate} hours={hours} setHours={setHours}
          matterId={matterId} setMatterId={setMatterId} matters={matters}
          description={description} setDescription={setDescription}
          billable={billable} setBillable={setBillable}
        />
        <SheetFooter>
          <Button disabled={pending || !matterId} onClick={submit}>Lưu</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function TimeEntryFields({
  date, setDate, hours, setHours, matterId, setMatterId, matters, description, setDescription, billable, setBillable
}: {
  date: string; setDate: (v: string) => void;
  hours: string; setHours: (v: string) => void;
  matterId: string; setMatterId: (v: string) => void;
  matters: { id: string; label: string }[];
  description: string; setDescription: (v: string) => void;
  billable: boolean; setBillable: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3 px-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Ngày</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><Label>Số giờ (bước 0.25)</Label><Input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} /></div>
      </div>
      <div>
        <Label>Dự án</Label>
        <select className="w-full rounded-md border bg-transparent h-9 px-2 text-sm" value={matterId} onChange={(e) => setMatterId(e.target.value)}>
          <option value="">— chọn dự án —</option>
          {matters.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </div>
      <div><Label>Nội dung</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} />
        Tính billable (tính phí khách hàng)
      </label>
    </div>
  );
}
