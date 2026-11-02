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
import { Loader2, Plus, Clock } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { createTask } from "@/server/tasks/actions";

type MatterPickerItem = { id: string; internalCode: string; title: string };

export function AddTaskDialog({
  open,
  onOpenChange,
  date,
  matters
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date: Date | null;
  matters: MatterPickerItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [matterId, setMatterId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<0 | 1 | 2>(0);
  const [allDay, setAllDay] = useState(false);
  const [time, setTime] = useState("09:00");

  useEffect(() => {
    if (!open) return;
    setMatterId("");
    setTitle("");
    setDescription("");
    setPriority(0);
    setAllDay(false);
    setTime("09:00");
  }, [open]);

  function submit() {
    if (!matterId) {
      toast.warning("Hãy chọn vụ án liên kết");
      return;
    }
    if (!title.trim()) {
      toast.warning("Hãy nhập tiêu đề công việc");
      return;
    }
    if (!date) {
      toast.warning("Thiếu ngày");
      return;
    }

    // Tổng hợp dueAt: cả ngày → 23:59; có giờ → phân tích HH:MM
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
        toast.success("Đã thêm công việc");
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
            <Plus className="h-4 w-4 text-primary" />
            Thêm công việc
          </DialogTitle>
          <DialogDescription className="text-xs">
            {date
              ? date.toLocaleDateString("zh-CN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long"
                })
              : "—"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">
              Vụ án liên kết <span className="text-destructive">*</span>
            </Label>
            <Select value={matterId} onValueChange={setMatterId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {matters.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="font-mono text-[10.5px] text-muted-foreground">
                      {m.internalCode}
                    </span>
                    <span className="ml-2">{m.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Tiêu đề công việc <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="vd: soạn đơn khởi kiện / nộp danh mục chứng cứ"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              Giờ
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                step={300}
                value={time}
                disabled={allDay}
                onChange={(e) => setTime(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 font-mono text-sm tabular disabled:opacity-50"
              />
              <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Cả ngày
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Mô tả (tuỳ chọn)</Label>
            <Textarea
              rows={2}
              placeholder="Chi tiết công việc, tài liệu liên quan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
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
