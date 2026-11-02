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

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  FolderArchive,
  Search,
  Upload,
  Download,
  Trash2,
  History,
  X,
  Tag,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import type { FirmFileCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteFirmFile } from "@/server/firm-files/actions";
import { cn } from "@/lib/utils";
import { UploadDialog } from "./upload-dialog";
import { PreviewDialog } from "./preview-dialog";

type FileEntry = {
  id: string;
  name: string;
  description: string | null;
  category: FirmFileCategory;
  tags: string[];
  mimeType: string | null;
  size: number;
  uploadedBy: { id: string; name: string };
  createdAt: Date;
  hasNewerVersion: boolean;
  supersedesCount: number;
};

const CATEGORY_META: Record<FirmFileCategory, { label: string; color: string }> = {
  POLICY: { label: "Quy chế", color: "#9B7BF7" },
  GUIDE: { label: "Hướng dẫn", color: "#5B8DEF" },
  TEMPLATE: { label: "Mẫu tham khảo", color: "#48BB78" },
  REFERENCE: { label: "Tệp khác", color: "#F5A742" },
  CONTRACT: { label: "Hợp đồng", color: "#5B8DEF" },
  LETTER: { label: "Công văn", color: "#48BB78" },
  LICENSE: { label: "Giấy phép", color: "#F5A742" },
  OTHER_FIRM: { label: "Khác", color: "#9B7BF7" }
};

/** Phân loại hiển thị ở trang văn bản văn phòng */
const FIRM_DOC_CATEGORIES: FirmFileCategory[] = ["CONTRACT", "LETTER", "LICENSE", "OTHER_FIRM"];
/** Phân loại cũ (tương thích dữ liệu đã có) */
const LEGACY_CATEGORIES: FirmFileCategory[] = ["POLICY", "GUIDE", "TEMPLATE", "REFERENCE"];

function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

export function FirmFilesView({
  files,
  canUpload,
  currentCategory,
  currentSearch,
  includeSuperseded,
  basePath = "/firm-resources",
  preservedParams = [],
  hideHeader,
  hideCategoryNav,
  headerTitle,
  headerSubtitle,
  headerIcon,
  categorySet
}: {
  files: FileEntry[];
  canUpload: boolean;
  currentCategory?: FirmFileCategory;
  currentSearch: string;
  includeSuperseded: boolean;
  /** v0.27: để service-center tái dùng chung một component và giữ ?tab= */
  basePath?: string;
  preservedParams?: string[];
  /** v0.37: nhúng trong trang ứng dụng —— ẩn tiêu đề/giới thiệu (tab đã đánh dấu) */
  hideHeader?: boolean;
  /** v0.37: ẩn thanh lọc phân loại (vd tab「quy chế」chỉ liệt kê POLICY) */
  hideCategoryNav?: boolean;
  /** v0.44: đè tiêu đề/phụ đề/icon mặc định */
  headerTitle?: string;
  headerSubtitle?: string;
  headerIcon?: React.ReactNode;
  /** v0.44: tập phân loại ("firm"=phân loại mới văn bản VP, mặc định phân loại cũ) */
  categorySet?: "firm" | "legacy";
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [search, setSearch] = useState(currentSearch);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeCategories = categorySet === "firm" ? FIRM_DOC_CATEGORIES : LEGACY_CATEGORIES;

  function navigate(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    // Giữ query chỉ định (vd tab=firm-files)
    for (const k of preservedParams) {
      const v = sp.get(k);
      if (v) next.set(k, v);
    }
    // Gộp query liên quan firm-file hiện tại (category / q / includeOld)
    for (const k of ["category", "q", "includeOld"]) {
      const v = sp.get(k);
      if (v) next.set(k, v);
    }
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ q: search.trim() || undefined });
  }

  function handleDelete(f: FileEntry) {
    if (!confirm(`Xác nhận xoá「${f.name}」?\n (xoá mềm, tìm lại được trong database)`)) return;
    setPendingId(f.id);
    startTransition(async () => {
      try {
        await deleteFirmFile({ id: f.id });
        toast.success("Đã xoá");
        router.refresh();
      } catch (err) {
        toast.error("Xoá thất bại", { description: err instanceof Error ? err.message : "" });
      } finally {
        setPendingId(null);
      }
    });
  }

  const counts = activeCategories.reduce<Record<FirmFileCategory, number>>(
    (acc, c) => {
      acc[c] = files.filter((f) => f.category === c).length;
      return acc;
    },
    // Initialize all to 0
    [...FIRM_DOC_CATEGORIES, ...LEGACY_CATEGORIES].reduce((acc, c) => { acc[c] = 0; return acc; }, {} as Record<FirmFileCategory, number>)
  );

  return (
    <div className="space-y-4">
      {!hideHeader ? (
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl">
              {headerIcon ?? <FolderArchive className="h-5 w-5 text-primary" strokeWidth={1.8} />}
              {headerTitle ?? "Văn bản văn phòng"}
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {headerSubtitle ?? (
                <>
                  Hợp đồng · Công văn · Giấy phép · Khác. Chia sẻ toàn văn phòng,
                  {canUpload ? "Quản trị viên được tải lên và thay thế phiên bản" : "Quản trị viên tải lên"}
                </>
              )}
            </p>
          </div>
          {canUpload && (
            <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Tải tài liệu lên
            </Button>
          )}
        </header>
      ) : (
        canUpload && (
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Tải tài liệu lên
            </Button>
          </div>
        )
      )}

      {/* Thanh lọc */}
      <div className="space-y-3">
        {!hideCategoryNav && (
        <div className="flex flex-wrap items-center gap-1.5">
          <CategoryChip
            label="Tất cả"
            color="#5B8DEF"
            count={files.length}
            active={!currentCategory}
            onClick={() => navigate({ category: undefined })}
          />
          {activeCategories.map((c) => (
            <CategoryChip
              key={c}
              label={CATEGORY_META[c].label}
              color={CATEGORY_META[c].color}
              count={counts[c]}
              active={currentCategory === c}
              onClick={() => navigate({ category: c })}
            />
          ))}
          <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={includeSuperseded}
              onChange={(e) =>
                navigate({ includeOld: e.target.checked ? "1" : undefined })
              }
              className="h-3.5 w-3.5 accent-primary"
            />
            Gồm bản cũ
          </label>
        </div>
        )}

        <form onSubmit={handleSearch} className="flex items-center gap-1.5">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên / mô tả / nhãn"
              className="pl-8 text-xs"
            />
            {currentSearch && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  navigate({ q: undefined });
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Button type="submit" size="sm" variant="outline">
            Tìm
          </Button>
        </form>
      </div>

      {/* Danh sách */}
      {files.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <FolderArchive className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {currentSearch
              ? `Không có tài liệu nào khớp「${currentSearch}」`
              : currentCategory
                ? `Không có tài liệu loại「${CATEGORY_META[currentCategory].label}」`
                : "Chưa tải lên tài liệu nào"}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {files.map((f) => {
            const meta = CATEGORY_META[f.category];
            return (
              <li
                key={f.id}
                className={cn(
                  "group rounded-xl border bg-card p-3",
                  f.hasNewerVersion
                    ? "border-amber-300 bg-amber-50/30"
                    : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 overflow-hidden">
                    {/* Hàng 1: tên tệp + nhãn + kích thước / thời gian */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewFile(f)}
                        className="truncate text-left text-sm font-medium text-foreground transition-colors hover:text-primary hover:underline"
                        title="Bấm để xem trước"
                      >
                        {f.name}
                      </button>
                      <span
                        className="shrink-0 rounded border px-1.5 py-0.5 text-[10px]"
                        style={{
                          borderColor: `${meta.color}40`,
                          color: meta.color,
                          backgroundColor: `${meta.color}10`
                        }}
                      >
                        {meta.label}
                      </span>
                      {f.hasNewerVersion && (
                        <span className="shrink-0 rounded border border-amber-400 bg-amber-100 px-1 py-0.5 text-[9px] text-amber-700">
                          Bản cũ
                        </span>
                      )}
                      {f.supersedesCount > 0 && (
                        <span
                          className="shrink-0 inline-flex items-center gap-0.5 rounded border border-violet-300 bg-violet-50 px-1 py-0.5 text-[9px] text-violet-700"
                          title={`Đã thay thế ${f.supersedesCount} bản cũ`}
                        >
                          <History className="h-2.5 w-2.5" />v{f.supersedesCount + 1}
                        </span>
                      )}
                      <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="font-mono tabular">{formatBytes(f.size)}</span>
                        <span className="opacity-50">·</span>
                        <span>{new Date(f.createdAt).toLocaleDateString("zh-CN")}</span>
                        <span className="opacity-50">·</span>
                        <span>{f.uploadedBy.name}</span>
                        {f.tags.length > 0 && (
                          <>
                            <span className="opacity-50">·</span>
                            <span className="flex items-center gap-0.5">
                              <Tag className="h-2.5 w-2.5" />
                              {f.tags.join(" / ")}
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                    {/* Hàng 2: giới thiệu; không điền thì cho một placeholder, tránh hụt hình ảnh */}
                    <p
                      className={cn(
                        "mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed",
                        f.description ? "text-muted-foreground" : "text-muted-foreground/50"
                      )}
                    >
                      {f.description || "(Chưa điền giới thiệu)"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <a
                      href={`/api/firm-files/${f.id}/download`}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-popover hover:text-primary"
                      title="Tải xuống"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                    {canUpload && (
                      <button
                        type="button"
                        onClick={() => handleDelete(f)}
                        disabled={pendingId === f.id || isPending}
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-popover hover:text-destructive group-hover:opacity-100"
                        title="Xoá"
                      >
                        {pendingId === f.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canUpload && (
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          existingFiles={files}
        />
      )}

      <PreviewDialog
        open={!!previewFile}
        file={previewFile}
        onOpenChange={(o) => {
          if (!o) setPreviewFile(null);
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
