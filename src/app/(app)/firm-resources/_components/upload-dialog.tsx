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

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { FirmFileCategory } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { uploadFirmFile } from "@/server/firm-files/actions";

const CATEGORY_OPTIONS: { value: FirmFileCategory; label: string }[] = [
  { value: "CONTRACT", label: "Hợp đồng" },
  { value: "LETTER", label: "Công văn" },
  { value: "LICENSE", label: "Giấy phép" },
  { value: "OTHER_FIRM", label: "Khác" },
  { value: "POLICY", label: "Quy chế" },
  { value: "GUIDE", label: "Hướng dẫn" },
  { value: "TEMPLATE", label: "Mẫu tham khảo" },
  { value: "REFERENCE", label: "Tệp khác" }
];

const NONE_VALUE = "__none__";

type ExistingFile = {
  id: string;
  name: string;
  hasNewerVersion: boolean;
};

export function UploadDialog({
  open,
  onOpenChange,
  existingFiles
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingFiles: ExistingFile[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<FirmFileCategory>("CONTRACT");
  const [tags, setTags] = useState("");
  const [supersedesId, setSupersedesId] = useState<string>(NONE_VALUE);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setFile(null);
    setName("");
    setDescription("");
    setCategory("CONTRACT");
    setTags("");
    setSupersedesId(NONE_VALUE);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFilePick(f: File | null) {
    setFile(f);
    if (f && !name) setName(f.name.replace(/\.[^.]+$/, ""));
  }

  function submit() {
    if (!file) {
      toast.warning("Hãy chọn tệp");
      return;
    }
    if (!name.trim()) {
      toast.warning("Tên bắt buộc nhập");
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("name", name.trim());
        fd.set("description", description.trim());
        fd.set("category", category);
        fd.set("tags", tags);
        if (supersedesId !== NONE_VALUE) fd.set("supersedesId", supersedesId);
        const res = await uploadFirmFile(fd);
        toast.success(
          supersedesId !== NONE_VALUE
            ? `Đã tải lên và thay thế bản cũ: ${res.name}`
            : `Đã tải lên: ${res.name}`
        );
        reset();
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error("Tải lên thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  // Bản cũ có thể bị thay thế: chỉ hiện bản cùng phân loại và không có phiên bản mới hơn
  const replaceableFiles = existingFiles.filter(
    (f) => !f.hasNewerVersion
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4 text-primary" />
            Tải tài liệu văn phòng lên
          </DialogTitle>
          <DialogDescription className="text-xs">
            Mỗi tệp ≤ 50MB; toàn văn phòng đều thấy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-[11px]">Tệp *</Label>
            <Input
              ref={fileRef}
              type="file"
              onChange={(e) => handleFilePick(e.target.files?.[0] ?? null)}
              className="mt-1"
            />
            {file && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)}MB
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px]">Tên *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="vd: Sổ tay nhân viên v2.4"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px]">Phân loại *</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as FirmFileCategory)}
              >
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[11px]">Mô tả (tuỳ chọn)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giải thích ngắn gọn mục đích, trường hợp dùng"
              rows={2}
              className="mt-1 resize-none text-sm"
            />
          </div>

          <div>
            <Label className="text-[11px]">Nhãn (phân cách bằng dấu phẩy / dấu cách)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="vd: cộng sự,lương,2024"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-[11px]">
              Thay thế bản cũ nào? (tuỳ chọn; chọn xong bản cũ sẽ bị đánh dấu&ldquo;bản cũ&rdquo;)
            </Label>
            <Select value={supersedesId} onValueChange={setSupersedesId}>
              <SelectTrigger className="mt-1 h-9 text-xs">
                <SelectValue placeholder="Không thay thế tệp nào (thêm mới)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Không thay thế tệp nào (thêm mới)</SelectItem>
                {replaceableFiles.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={isPending || !file}>
            {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Tải lên
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
