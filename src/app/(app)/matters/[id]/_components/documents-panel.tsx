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

import { useState, useRef, useTransition } from "react";
import { toast } from "sonner";
import {
  Plus,
  FileBox,
  Download,
  Trash2,
  Lock,
  Loader2,
  Upload,
  File as FileIcon,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  Sparkles
} from "lucide-react";
import type { DocumentCategory, Document } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import { uploadDocument, deleteDocument } from "@/server/documents/actions";
import { cn } from "@/lib/utils";
import { DocumentReviewDialog } from "./document-review-dialog";

// Kiểm tra mime AI hỗ trợ (frontend quyết định có sáng nút)
const AI_REVIEW_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/docx",
  "text/plain",
  "text/markdown"
]);
function canReviewByAi(mime: string | null | undefined) {
  if (!mime) return false;
  if (AI_REVIEW_MIMES.has(mime)) return true;
  return mime.startsWith("text/");
}

export type DocumentPayload = Document & {
  uploadedBy: { id: string; name: string };
  procedure: { id: string; type: string; customLabel: string | null } | null;
};

const categoryLabel: Record<DocumentCategory, string> = {
  EVIDENCE: "Tài liệu chứng cứ",
  PLEADING: "Văn bản tố tụng",
  PROCEDURE: "Tài liệu thủ tục",
  JUDGMENT: "Văn bản quyết định",
  CONTRACT: "Hợp đồng",
  OTHER: "Khác"
};

const categoryColor: Record<DocumentCategory, string> = {
  EVIDENCE: "#5B8DEF",
  PLEADING: "#4FD1C5",
  PROCEDURE: "#9B7BF7",
  JUDGMENT: "#FBBF24",
  CONTRACT: "#4ADE80",
  OTHER: "#9BA8C7"
};

function iconFor(mimeType: string | null) {
  if (!mimeType) return FileIcon;
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return FileSpreadsheet;
  if (mimeType.includes("pdf") || mimeType.includes("word") || mimeType.startsWith("text/")) return FileText;
  if (mimeType.includes("zip") || mimeType.includes("rar")) return FileArchive;
  return FileIcon;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

const CATEGORIES: DocumentCategory[] = [
  "EVIDENCE",
  "PLEADING",
  "PROCEDURE",
  "JUDGMENT",
  "CONTRACT",
  "OTHER"
];

export function DocumentsPanel({
  matterId,
  matterStatus,
  documents,
  procedures,
  folders
}: {
  matterId: string;
  matterStatus?: string;
  documents: DocumentPayload[];
  procedures: { id: string; label: string }[];
  folders: { id: string; name: string }[];
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<DocumentCategory | "ALL">("ALL");
  const [isPending, startTransition] = useTransition();
  const [reviewDocId, setReviewDocId] = useState<string | null>(null);

  const filtered =
    activeCategory === "ALL"
      ? documents
      : documents.filter((d) => d.category === activeCategory);

  // Thống kê theo category
  const counts = CATEGORIES.reduce<Record<DocumentCategory, number>>(
    (acc, c) => {
      acc[c] = documents.filter((d) => d.category === c).length;
      return acc;
    },
    { EVIDENCE: 0, PLEADING: 0, PROCEDURE: 0, JUDGMENT: 0, CONTRACT: 0, OTHER: 0 }
  );

  function handleDelete(id: string, name: string) {
    if (!confirm(`Xóa tài liệu "${name}"?`)) return;
    startTransition(async () => {
      try {
        await deleteDocument(id);
        toast.success("Đã xóa (vẫn giữ trong kiểm toán)");
      } catch (err) {
        toast.error("Xóa thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Tổng {documents.length} tài liệu · mỗi tệp ≤ 20MB · mã hóa tuỳ chọn
        </p>
        <Button
          onClick={() => setSheetOpen(true)}
          size="sm"
          className="gap-1.5 "
        >
          <Plus className="h-4 w-4" />
          Tải lên tài liệu
        </Button>
      </header>

      {/* Lọc theo loại */}
      <div className="flex flex-wrap gap-1.5">
        <CategoryChip
          label="Tất cả"
          color="#5B8DEF"
          count={documents.length}
          active={activeCategory === "ALL"}
          onClick={() => setActiveCategory("ALL")}
        />
        {CATEGORIES.map((c) => (
          <CategoryChip
            key={c}
            label={categoryLabel[c]}
            color={categoryColor[c]}
            count={counts[c]}
            active={activeCategory === c}
            onClick={() => setActiveCategory(c)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <FileBox className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {activeCategory === "ALL" ? "Chưa có tài liệu" : `Không có tài liệu loại 「${categoryLabel[activeCategory]}」`}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {filtered.map((d) => {
            const Icon = iconFor(d.mimeType);
            const color = categoryColor[d.category];
            return (
              <li
                key={d.id}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border"
                  style={{ borderColor: `${color}40`, color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{d.name}</span>
                    {d.encrypted && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded-md border border-[#9B7BF7]/40 px-1 py-0.5 text-[9px] text-[#9B7BF7]"
                        title="Lưu trữ mã hóa AES-256-GCM"
                      >
                        <Lock className="h-2.5 w-2.5" />
                        Mã hóa
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <Badge
                      variant="outline"
                      className="text-[9px]"
                      style={{ borderColor: `${color}40`, color }}
                    >
                      {categoryLabel[d.category]}
                    </Badge>
                    {d.procedure && (
                      <span>{d.procedure.customLabel ?? d.procedure.type}</span>
                    )}
                    {d.size && <span className="font-mono tabular">{formatBytes(d.size)}</span>}
                    <span>·</span>
                    <span>{d.uploadedBy.name}</span>
                    <span className="font-mono tabular">
                      {new Date(d.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {canReviewByAi(d.mimeType) && (
                    <button
                      type="button"
                      onClick={() => setReviewDocId(d.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-popover hover:text-violet-600"
                      title="Kiểm tra AI"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <a
                    href={`/api/documents/${d.id}/download`}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-popover hover:text-primary"
                    title="Tải về"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(d.id, d.name)}
                    disabled={isPending}
                    className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-popover hover:text-destructive group-hover:opacity-100"
                    title="Xóa"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <UploadSheet
        matterId={matterId}
        matterStatus={matterStatus}
        procedures={procedures}
        folders={folders}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
      <DocumentReviewDialog
        open={reviewDocId !== null}
        documentId={reviewDocId}
        matterId={matterId}
        onOpenChange={(o) => {
          if (!o) setReviewDocId(null);
        }}
      />
    </div>
  );
}

function CategoryChip({
  label,
  color,
  count,
  active,
  onClick
}: {
  label: string;
  color: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-input"
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
      <span className="font-mono text-[10px] tabular opacity-70">{count}</span>
    </button>
  );
}

const ARCHIVE_FOLDER_NAMES = new Set(["Kết thúc", "Lưu trữ"]);

function UploadSheet({
  matterId,
  matterStatus,
  procedures,
  folders,
  open,
  onOpenChange
}: {
  matterId: string;
  matterStatus?: string;
  procedures: { id: string; label: string }[];
  folders: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const isArchived = matterStatus === "ARCHIVED";
  const visibleFolders = isArchived
    ? folders.filter((f) => ARCHIVE_FOLDER_NAMES.has(f.name))
    : folders;

  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("EVIDENCE");
  const [procedureId, setProcedureId] = useState<string>("none");
  const [folderId, setFolderId] = useState<string>(
    isArchived ? (visibleFolders[0]?.id ?? "none") : "none"
  );
  const [encrypted, setEncrypted] = useState(false);

  function reset() {
    setFile(null);
    setName("");
    setCategory("EVIDENCE");
    setProcedureId("none");
    setFolderId(isArchived ? (visibleFolders[0]?.id ?? "none") : "none");
    setEncrypted(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !name) {
      // Mặc định lấy tên tệp (bỏ đuôi) điền vào name
      const stem = f.name.replace(/\.[^.]+$/, "");
      setName(stem);
    }
  }

  function handleSubmit() {
    if (!file) {
      toast.warning("Vui lòng chọn tệp");
      return;
    }
    if (!name.trim()) {
      toast.warning("Vui lòng nhập tên tài liệu");
      return;
    }
    if (isArchived && folderId === "none") {
      toast.warning("Vụ án đã lưu trữ, cần chọn hồ sơ 「Kết thúc」 hoặc 「Lưu trữ」");
      return;
    }
    const fd = new FormData();
    fd.set("matterId", matterId);
    fd.set("name", name.trim());
    fd.set("category", category);
    if (procedureId !== "none") fd.set("procedureId", procedureId);
    if (folderId !== "none") fd.set("folderId", folderId);
    fd.set("encrypted", String(encrypted));
    fd.set("file", file);

    startTransition(async () => {
      try {
        await uploadDocument(fd);
        toast.success("Đã tải lên");
        reset();
        onOpenChange(false);
      } catch (err) {
        toast.error("Tải lên thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <SheetContent side="right" className="flex w-full max-w-md flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border bg-background px-6 py-4">
          <SheetTitle>Tải lên tài liệu</SheetTitle>
          <SheetDescription className="text-xs">
            Mỗi tệp tối đa 20MB · sau khi mã hóa, tải về cần xác thực giải mã
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* Chọn tệp */}
          <div className="space-y-1.5">
            <Label className="text-xs">Tệp *</Label>
            <div
              className={cn(
                "flex items-center gap-3 rounded-md border border-dashed p-4",
                file ? "border-primary bg-primary/5" : "border-border bg-background"
              )}
            >
              <input
                ref={fileRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="doc-file-input"
              />
              <label
                htmlFor="doc-file-input"
                className="flex flex-1 cursor-pointer items-center gap-2"
              >
                <Upload className="h-4 w-4 text-muted-foreground" />
                {file ? (
                  <div className="overflow-hidden">
                    <div className="truncate text-sm">{file.name}</div>
                    <div className="font-mono text-[11px] text-muted-foreground tabular">
                      {formatBytes(file.size)}
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Bấm để chọn tệp</span>
                )}
              </label>
              {file && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="h-7 text-xs"
                >
                  Xoá
                </Button>
              )}
            </div>
          </div>

          <Field label="Tên tài liệu" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="vd: Chứng cứ 1 - Hợp đồng thi công"
            />
          </Field>

          <Field label="Loại">
            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {categoryLabel[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={isArchived ? "Hồ sơ lưu trữ *" : "Hồ sơ chứa"}>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger>
                <SelectValue placeholder={isArchived ? "Chọn hồ sơ lưu trữ" : "Tuỳ chọn"} />
              </SelectTrigger>
              <SelectContent>
                {!isArchived && <SelectItem value="none">Không thuộc hồ sơ nào (tài liệu rời)</SelectItem>}
                {visibleFolders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                    {ARCHIVE_FOLDER_NAMES.has(f.name) ? " · Lưu trữ" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isArchived && (
              <p className="text-[11px] text-[#9B7BF7]">
                Vụ án đã lưu trữ, chỉ cho bù tài liệu vào hồ sơ 「Kết thúc」 hoặc 「Lưu trữ」
              </p>
            )}
          </Field>

          {procedures.length > 0 && (
            <Field label="Thủ tục chứa">
              <Select value={procedureId} onValueChange={setProcedureId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không thuộc thủ tục nào</SelectItem>
                  {procedures.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-background p-3">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-sm">
                <Lock className="h-3.5 w-3.5 text-[#9B7BF7]" />
                Mã hóa lưu trữ
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Với tài liệu nhạy cảm nên bật. Tải về tự giải mã; nếu mất STORAGE_ENCRYPTION_KEY thì
                tài liệu này không khôi phục được
              </p>
            </div>
            <Switch checked={encrypted} onCheckedChange={setEncrypted} />
          </div>
        </div>

        <SheetFooter className="border-t border-border bg-background px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !file} className="gap-1.5">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Tải lên
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({
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
      <Label className="text-xs">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
