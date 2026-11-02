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
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  createAnnouncement,
  updateAnnouncement
} from "@/server/announcements/actions";

type Editing = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  expiresAt: Date | null;
} | null;

function toDateInput(d: Date | null): string {
  if (!d) return "";
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// eslint-disable-next-line max-lines-per-function, max-statements
export function AnnouncementDialog({
  open,
  onOpenChange,
  editing
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Editing;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      if (editing) {
        setTitle(editing.title);
        setContent(editing.content);
        setPinned(editing.pinned);
        setExpiresAt(toDateInput(editing.expiresAt));
      } else {
        setTitle("");
        setContent("");
        setPinned(false);
        setExpiresAt("");
      }
    }
  }, [open, editing]);

  function handleSave() {
    if (!title.trim() || !content.trim()) {
      toast.error("Tiêu đề và nội dung bắt buộc nhập");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          title,
          content,
          pinned,
          expiresAt: expiresAt ? new Date(expiresAt) : null
        };
        if (editing) {
          await updateAnnouncement({ ...payload, id: editing.id });
          toast.success("Đã cập nhật");
        } else {
          await createAnnouncement(payload);
          toast.success("Đã đăng");
        }
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error("Lưu thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Sửa thông báo" : "Đăng thông báo"}</DialogTitle>
          <DialogDescription className="text-xs">
            Thông báo ghim sẽ hiện ở banner đầu toàn site, đặt ngày hết hạn xong banner tự biến mất (danh sách vẫn giữ).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Tiêu đề *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nội dung *</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Hỗ trợ xuống dòng văn bản thường"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={pinned}
                onCheckedChange={(c) => setPinned(c === true)}
              />
              Ghim (banner đầu trang)
            </label>
            <div className="space-y-1.5">
              <Label className="text-xs">Ngày hết hạn (tuỳ chọn)</Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Huỷ
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {editing ? "Cập nhật" : "Đăng"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
