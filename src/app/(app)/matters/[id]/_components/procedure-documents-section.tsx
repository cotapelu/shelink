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

/**
 * v0.27: Khu "tài liệu vụ án" dưới thủ tục
 * v0.42: tab chuyển phân loại + bên nguồn + xem trực tuyến docx/xlsx
 *
 * - Mỗi thủ tục hiển thị độc lập Document liên kết với mình
 * - Khi tải lên bắt buộc chọn category; loại tố tụng / chứng cứ có thể ghi bên nguồn (lấy từ các bên của vụ án)
 * - Xem trước: pdf/ảnh/văn bản đi qua download?inline=1; docx/xlsx đi qua /preview chuyển HTML
 */
import { useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  Loader2,
  Plus,
  Trash2,
  Download,
  Eye
} from "lucide-react";
import type { DocumentCategory, LitigationStanding } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { uploadDocument, deleteDocument } from "@/server/documents/document-upload";
import { canPreview, officePreviewKind } from "@/lib/storage/mime-ext";
import { cn, formatDate } from "@/lib/utils";
import { litigationStandingLabel } from "@/lib/enums";

// v0.42: đổi tên nhãn phân loại theo thói quen luật sư
const categoryLabel: Record<DocumentCategory, string> = {
  PLEADING: "Văn bản tố tụng",
  EVIDENCE: "Chứng cứ",
  PROCEDURE: "Tài liệu thủ tục",
  JUDGMENT: "Quyết định",
  CONTRACT: "Khác",
  OTHER: "Khác"
};
const CATEGORY_OPTIONS: DocumentCategory[] = [
  "PLEADING",
  "EVIDENCE",
  "PROCEDURE",
  "JUDGMENT",
  "OTHER"
];
// Các loại cần ghi bên nguồn (tố tụng / chứng cứ)
const SOURCE_CATEGORIES: DocumentCategory[] = ["PLEADING", "EVIDENCE"];
const COURT_PROCEDURE_SOURCE = "Tài liệu thủ tục toà án";

type ProcedureParty = {
  id: string;
  standing: LitigationStanding;
  ordinal: number;
  party: { id: string; name: string };
};

type DocItem = {
  id: string;
  name: string;
  category: DocumentCategory;
  mimeType: string | null;
  size: number | null;
  createdAt: Date;
  sourceParty: string | null;
  path: string;
};

function iconFor(d: Pick<DocItem, "mimeType" | "name">) {
  const mime = d.mimeType?.toLowerCase() ?? "";
  const ext = d.name.split(".").pop()?.toLowerCase() ?? "";

  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(ext)) {
    return { src: "/file-icons/image.svg", alt: "Tệp ảnh" };
  }
  if (mime.includes("pdf") || ext === "pdf") {
    return { src: "/file-icons/pdf.svg", alt: "Tệp PDF" };
  }
  if (
    mime.includes("word") ||
    mime.includes("msword") ||
    ["doc", "docx"].includes(ext)
  ) {
    return { src: "/file-icons/word.svg", alt: "Tệp Word" };
  }
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    ["xls", "xlsx", "csv"].includes(ext)
  ) {
    return { src: "/file-icons/excel.svg", alt: "Tệp Excel" };
  }
  if (
    mime.includes("presentation") ||
    mime.includes("powerpoint") ||
    ["ppt", "pptx"].includes(ext)
  ) {
    return { src: "/file-icons/presentation.svg", alt: "Trình chiếu" };
  }
  if (mime.includes("json") || ext === "json") {
    return { src: "/file-icons/json.svg", alt: "Tệp JSON" };
  }
  if (
    mime.includes("xml") ||
    ["xml", "html", "htm", "css", "js", "jsx", "ts", "tsx", "java", "py", "go", "rb", "php", "sh", "yml", "yaml"].includes(ext)
  ) {
    return { src: "/file-icons/code.svg", alt: "Tệp mã" };
  }
  if (
    mime.startsWith("text/") ||
    ["txt", "md", "rtf", "log"].includes(ext)
  ) {
    return { src: "/file-icons/text.svg", alt: "Tệp văn bản" };
  }
  if (
    mime.includes("zip") ||
    mime.includes("rar") ||
    ["zip", "rar", "7z", "tar", "gz"].includes(ext)
  ) {
    return { src: "/file-icons/archive.svg", alt: "Gói nén" };
  }
  if (mime.startsWith("audio/") || ["mp3", "wav", "m4a", "aac"].includes(ext)) {
    return { src: "/file-icons/audio.svg", alt: "Tệp âm thanh" };
  }
  if (mime.startsWith("video/") || ["mp4", "mov", "avi", "mkv"].includes(ext)) {
    return { src: "/file-icons/video.svg", alt: "Tệp video" };
  }
  return { src: "/file-icons/generic.svg", alt: "Tệp" };
}

// URL xem trước: tài liệu office chuyển HTML, còn lại đi inline
function previewUrl(d: DocItem): string | null {
  if (officePreviewKind(d.mimeType, d.name)) {
    return `/api/documents/${d.id}/preview`;
  }
  if (canPreview(d.mimeType, d.name)) {
    return `/api/documents/${d.id}/download?inline=1`;
  }
  return null;
}

export function ProcedureDocumentsSection({
  matterId,
  procedureId,
  documents,
  procedureParties,
  canManage
}: {
  matterId: string;
  procedureId: string;
  documents: DocItem[];
  procedureParties: ProcedureParty[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>("PLEADING");
  const [sourceParty, setSourceParty] = useState<string>("");
  const [customName, setCustomName] = useState("");
  const [isPending, startTransition] = useTransition();
  // Lọc theo phân loại hiện tại (tất cả = null)
  const [filter, setFilter] = useState<DocumentCategory | null>(null);

  // Tuỳ chọn thuộc/nguồn: các bên của thủ tục hiện tại (lập trường tố tụng + tên)
  const sourceOptions = useMemo(
    () => {
      const seen = new Set<string>([COURT_PROCEDURE_SOURCE]);
      const partyOptions = [...procedureParties]
        .sort((a, b) => a.ordinal - b.ordinal || a.party.name.localeCompare(b.party.name, "zh-Hans-CN"))
        .map((row) => {
          const name = row.party.name.trim();
          if (!name) return null;
          return `${litigationStandingLabel[row.standing] ?? row.standing}·${name}`;
        })
        .filter((label): label is string => {
          if (!label || seen.has(label)) return false;
          seen.add(label);
          return true;
        });
      return [COURT_PROCEDURE_SOURCE, ...partyOptions];
    },
    [procedureParties]
  );

  const filtered = useMemo(
    () => (filter ? documents.filter((d) => d.category === filter) : documents),
    [documents, filter]
  );


  function handleSubmit() {
    if (!picked) {
      toast.error("Hãy chọn tệp trước");
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("matterId", matterId);
        fd.set("procedureId", procedureId);
        fd.set("file", picked);
        fd.set("category", category);
        if (SOURCE_CATEGORIES.includes(category) && sourceParty) {
          fd.set("sourceParty", sourceParty);
        }
        fd.set("name", customName.trim() || picked.name);
        await uploadDocument(fd);
        toast.success("Tải lên thành công");
        setOpen(false);
        setPicked(null);
        setCustomName("");
        setSourceParty("");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } catch (err) {
        toast.error("Tải lên thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Xoá tài liệu "${name}"?`)) return;
    startTransition(async () => {
      try {
        await deleteDocument(id);
        toast.success("Đã xoá");
        router.refresh();
      } catch (err) {
        toast.error("Xoá thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <section className="h-full rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap">
            Tài liệu vụ án
            <span className="ml-1 font-mono text-[11px] text-muted-foreground tabular">
              {documents.length}
            </span>
          </span>
          {/* Nhóm nút phân loại (tham khảo duyệt dùng dấu) */}
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setFilter(null)}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] transition-colors",
                filter === null
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tất cả
            </button>
            {CATEGORY_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(filter === c ? null : c)}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] transition-colors",
                  filter === c
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {categoryLabel[c]}
              </button>
            ))}
          </div>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setOpen(true)} className="h-6 gap-0.5 px-2 text-[11px] shrink-0">
            <Plus className="h-2.5 w-2.5" />
            Tải lên
          </Button>
        )}
      </header>

      {filtered.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">
          {filter ? "Chưa có tài liệu trong phân loại này" : "Thủ tục này chưa có tài liệu"}
        </p>
      ) : (
        // Danh sách dòng từng tệp, không khung ngoài
        <ul className="divide-y divide-border px-4">
          {filtered.map((d) => {
            const icon = iconFor(d);
            const pUrl = previewUrl(d);
            return (
              <li
                key={d.id}
                className="group flex items-center gap-2 py-2"
              >
                <Image src={icon.src} alt={icon.alt} width={20} height={20} className="h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  {pUrl ? (
                    <a
                      href={pUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-xs hover:text-primary hover:underline"
                      title="Bấm để mở xem"
                    >
                      {d.name}
                    </a>
                  ) : (
                    <span className="truncate text-xs" title={d.name}>
                      {d.name}
                    </span>
                  )}
                  <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {formatDate(d.createdAt)}
                    {d.size ? ` · ${(d.size / 1024).toFixed(0)}KB` : ""}
                    {d.sourceParty ? ` · ${d.sourceParty}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {pUrl && (
                    <a
                      href={pUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-muted-foreground hover:text-primary"
                      title="Xem trước"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <a
                    href={`/api/documents/${d.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-muted-foreground hover:text-primary"
                    title="Tải xuống"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDelete(d.id, d.name)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      title="Xoá"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canManage && (
        <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tải lên tài liệu vụ án</DialogTitle>
            <DialogDescription className="text-xs">
              Tệp ≤ 20MB · Tự động liên kết tới thủ tục hiện tại
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Loại tài liệu *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabel[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* v0.42 thuộc/nguồn: chỉ hiện với loại tố tụng / chứng cứ, tuỳ chọn = các bên của thủ tục hiện tại */}
            {SOURCE_CATEGORIES.includes(category) && sourceOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Thuộc/nguồn (tuỳ chọn)</Label>
                <Select
                  value={sourceParty || "__none__"}
                  onValueChange={(v) => setSourceParty(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Chọn thuộc/nguồn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Không ghi</SelectItem>
                    {sourceOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Tệp *</Label>
              <Input
                ref={fileRef}
                type="file"
                onChange={(e) => setPicked(e.target.files?.[0] ?? null)}
              />
              {picked && (
                <p className="text-[10px] text-muted-foreground">
                  Đã chọn {picked.name} ({(picked.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tên hiển thị (tuỳ chọn, để trống dùng tên tệp)</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="vd: Đơn khởi kiện của nguyên đơn - bản chốt"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Huỷ
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !picked}>
              {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Tải lên
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
