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
import { toast } from "sonner";
import type { CustomFieldDef } from "@prisma/client";
import { Plus, Pencil, Trash2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  createCustomFieldDef,
  updateCustomFieldDef,
  deleteCustomFieldDef,
  toggleCustomFieldDef
} from "@/server/custom-fields/actions";

const TYPE_LABEL: Record<CustomFieldDef["fieldType"], string> = {
  TEXT: "Văn bản",
  NUMBER: "Số",
  DATE: "Ngày",
  SELECT: "Dropdown"
};

export function CustomFieldsView({ matterFields }: { matterFields: CustomFieldDef[] }) {
  const [editing, setEditing] = useState<CustomFieldDef | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string, label: string) {
    if (!confirm(`Xoá trường tuỳ chỉnh "${label}"? Giá trị tương ứng đã nhập sẽ không còn hiển thị.`)) return;
    startTransition(async () => {
      try {
        await deleteCustomFieldDef(id);
        toast.success("Đã xoá");
      } catch (err) {
        toast.error("Xoá thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  function handleToggle(id: string, enabled: boolean) {
    startTransition(async () => {
      try {
        await toggleCustomFieldDef(id, enabled);
      } catch (err) {
        toast.error("Thao tác thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <ListChecks className="h-4 w-4 text-primary" />
            Trường tuỳ chỉnh của vụ án
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Thêm trường đặc thù của tổ chức cho vụ án, điền khi tạo/sửa chi tiết vụ án.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Thêm trường
        </Button>
      </header>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
              <th className="px-4 py-2 font-medium">Tên trường</th>
              <th className="px-4 py-2 font-medium">Loại</th>
              <th className="px-4 py-2 font-medium">Bắt buộc</th>
              <th className="px-4 py-2 font-medium">Giá trị tuỳ chọn</th>
              <th className="px-4 py-2 font-medium">Bật</th>
              <th className="px-4 py-2 text-right font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {matterFields.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Chưa có trường tuỳ chỉnh nào, bấm「Thêm trường」ở góc phải
                </td>
              </tr>
            ) : (
              matterFields.map((f) => (
                <tr key={f.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-foreground">{f.label}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{TYPE_LABEL[f.fieldType]}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{f.required ? "Có" : "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {f.fieldType === "SELECT" && f.options.length > 0
                      ? f.options.join(" / ")
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <Switch
                      checked={f.enabled}
                      onCheckedChange={(v) => handleToggle(f.id, v)}
                      disabled={pending}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setEditing(f)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => handleDelete(f.id, f.label)}
                        disabled={pending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <FieldFormDialog
        key={editing?.id ?? "create"}
        open={createOpen || !!editing}
        field={editing}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function FieldFormDialog({
  open,
  field,
  onClose
}: {
  open: boolean;
  field: CustomFieldDef | null;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(field?.label ?? "");
  const [fieldType, setFieldType] = useState<CustomFieldDef["fieldType"]>(
    field?.fieldType ?? "TEXT"
  );
  const [required, setRequired] = useState(field?.required ?? false);
  const [optionsText, setOptionsText] = useState((field?.options ?? []).join("\n"));
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!label.trim()) {
      toast.warning("Hãy nhập tên trường");
      return;
    }
    const options =
      fieldType === "SELECT"
        ? optionsText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    if (fieldType === "SELECT" && options.length === 0) {
      toast.warning("Loại dropdown hãy nhập ít nhất một tuỳ chọn (mỗi dòng một cái)");
      return;
    }
    startTransition(async () => {
      try {
        if (field) {
          await updateCustomFieldDef({ id: field.id, label, fieldType, required, options });
        } else {
          await createCustomFieldDef({ entityType: "MATTER", label, fieldType, required, options });
        }
        toast.success(field ? "Đã cập nhật" : "Đã thêm");
        onClose();
      } catch (err) {
        toast.error("Lưu thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{field ? "Sửa trường" : "Thêm trường"}</DialogTitle>
          <DialogDescription>Trường sẽ xuất hiện trong「Thông tin tuỳ chỉnh」ở chi tiết vụ án.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tên trường</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="vd: Mã nội bộ đảm nhận" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Loại trường</label>
            <Select
              value={fieldType}
              onValueChange={(v) => setFieldType(v as CustomFieldDef["fieldType"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEXT">Văn bản</SelectItem>
                <SelectItem value="NUMBER">Số</SelectItem>
                <SelectItem value="DATE">Ngày</SelectItem>
                <SelectItem value="SELECT">Dropdown</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {fieldType === "SELECT" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Giá trị tuỳ chọn (mỗi dòng một cái)</label>
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder={"Tuỳ chọn 1\nTuỳ chọn 2"}
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={required} onCheckedChange={setRequired} />
            Bắt buộc
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={pending}>
            {field ? "Lưu" : "Thêm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
