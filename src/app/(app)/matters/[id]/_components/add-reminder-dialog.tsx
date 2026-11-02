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

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { createTask } from "@/server/tasks/actions";

/**
 * v0.16: Dialog tạo mới trong thẻ "Thời hạn & nhắc nhở quan trọng" ở chi tiết vụ án
 * Tái sử dụng bảng Task (matterId + title + dueAt + description + priority)
 */
export function AddReminderDialog({
  open,
  onOpenChange,
  matterId
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [allDay, setAllDay] = useState(false);
  const [priority, setPriority] = useState<0 | 1 | 2>(0);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDate(new Date().toISOString().slice(0, 10));
    setTime("09:00");
    setAllDay(false);
    setPriority(0);
    setDescription("");
  }, [open]);

  function submit() {
    if (!title.trim()) {
      toast.warning("Hãy nhập tiêu đề nhắc nhở");
      return;
    }
    if (!date) {
      toast.warning("Hãy chọn ngày");
      return;
    }

    const dueAt = new Date(date);
    if (allDay) {
      dueAt.setHours(23, 59, 0, 0);
    } else {
      const [hh, mm] = time.split(":").map(Number);
      if (Number.isFinite(hh) && Number.isFinite(mm)) {
        dueAt.setHours(hh, mm, 0, 0);
      }
    }

    startTransition(async () => {
      try {
        await createTask({
          matterId,
          title: title.trim(),
          description,
          dueAt,
          priority,
          assigneeId: "",
          stageId: ""
        });
        toast.success("Đã thêm");
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error("Thêm thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Thêm thời hạn / nhắc nhở quan trọng
          </DialogTitle>
          <DialogDescription className="text-xs">
            Dùng làm ngày đến hạn, mốc then chốt hoặc việc nhắc tuỳ chỉnh
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">
              Tiêu đề <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="vd: nộp bản trả lời / nộp phí bảo toàn / nộp danh mục chứng cứ"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Ngày <span className="text-destructive">*</span>
              </Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Giờ</Label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  step={300}
                  value={time}
                  disabled={allDay}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-9 flex-1 rounded-md border border-input bg-background px-2 font-mono text-sm tabular disabled:opacity-50"
                />
                <label className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="h-3 w-3"
                  />
                  Cả ngày
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Mức ưu tiên</Label>
            <div className="flex gap-2">
              {[
                { value: 0, label: "Thường" },
                { value: 1, label: "Cao" },
                { value: 2, label: "Khẩn cấp" }
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value as 0 | 1 | 2)}
                  className={
                    priority === p.value
                      ? "rounded-md border border-primary bg-primary/15 px-3 py-1 text-xs text-primary"
                      : "rounded-md border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-input"
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Ghi chú (tuỳ chọn)</Label>
            <Textarea
              rows={2}
              placeholder="Diễn giải thêm, tài liệu liên quan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={isPending} className="gap-1.5">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Thêm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
