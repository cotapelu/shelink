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
import { motion } from "framer-motion";
import {
  FolderClosed,
  FolderOpen,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Download,
  Sparkles,
  Upload,
  Stamp
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createFolder,
  renameFolder,
  deleteFolder
} from "@/server/document-folders/actions";
import type { TemplateSummary, FolderPayload, FolderDocument } from "./folder-types";
import { TemplatePickerDialog } from "./template-picker-dialog";

export function FoldersPanel({
  matterId,
  matterCategory,
  folders,
  documents,
  templates
}: {
  matterId: string;
  matterCategory: string;
  folders: FolderPayload[];
  documents: FolderDocument[];
  templates: TemplateSummary[];
}) {
  const [activeFolderId, setActiveFolderId] = useState<string | null>(
    folders[0]?.id ?? null
  );
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FolderPayload | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  const byFolderId = new Map<string | null, FolderDocument[]>();
  byFolderId.set(null, []);
  for (const f of folders) byFolderId.set(f.id, []);
  for (const d of documents) {
    const k = d.folderId ?? null;
    if (!byFolderId.has(k)) byFolderId.set(k, []);
    byFolderId.get(k)!.push(d);
  }
  const loose = byFolderId.get(null) ?? [];

  const activeDocs = activeFolderId
    ? byFolderId.get(activeFolderId) ?? []
    : loose;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Thanh thao tác đầu */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg">Hồ sơ</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setTemplateOpen(true)}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Tạo từ mẫu
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.info("Chức năng tải tệp sẽ có ở v0.8.1")}
            className="gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            Tải tệp lên
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setNewFolderOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Tạo hồ sơ
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Cây hồ sơ bên trái */}
        <aside className="col-span-3 ll-surface rounded-lg p-2">
          <ul className="space-y-0.5">
            {folders.map((f) => (
              <FolderItem
                key={f.id}
                folder={f}
                active={f.id === activeFolderId}
                count={(byFolderId.get(f.id) ?? []).length}
                onClick={() => setActiveFolderId(f.id)}
                onRename={() => setRenameTarget(f)}
              />
            ))}
            {loose.length > 0 && (
              <li>
                <button
                  type="button"
                  onClick={() => setActiveFolderId(null)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] transition-colors",
                    activeFolderId === null
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <FolderClosed className="h-3.5 w-3.5" strokeWidth={1.6} />
                  <span className="flex-1 truncate">Tài liệu rời</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {loose.length}
                  </span>
                </button>
              </li>
            )}
          </ul>
        </aside>

        {/* Danh sách tài liệu bên phải */}
        <section className="col-span-9">
          {activeDocs.length === 0 ? (
            <div className="ll-surface rounded-lg p-10 text-center text-sm text-muted-foreground">
              <FolderOpen className="mx-auto mb-2 h-6 w-6 opacity-40" />
              Hồ sơ này chưa có tài liệu. Bấm「Tạo từ mẫu」ở góc phải để sinh văn bản đầu tiên.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {activeDocs.map((d) => (
                <DocCard key={d.id} doc={d} matterId={matterId} />
              ))}
            </div>
          )}
        </section>
      </div>

      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        matterId={matterId}
      />
      {renameTarget && (
        <RenameFolderDialog
          folder={renameTarget}
          open={!!renameTarget}
          onOpenChange={(o) => !o && setRenameTarget(null)}
        />
      )}
      <TemplatePickerDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        matterId={matterId}
        matterCategory={matterCategory}
        folders={folders}
        templates={templates}
      />
    </motion.div>
  );
}

function FolderItem({
  folder,
  active,
  count,
  onClick,
  onRename
}: {
  folder: FolderPayload;
  active: boolean;
  count: number;
  onClick: () => void;
  onRename: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const onDelete = () => {
    if (folder.isDefault) {
      toast.error("Hồ sơ mặc định không xoá được, có thể đổi tên");
      return;
    }
    if (!confirm(`Chắc chắn xoá hồ sơ "${folder.name}"? Tài liệu trong đó sẽ chuyển thành tài liệu rời.`)) return;
    startTransition(async () => {
      try {
        await deleteFolder({ id: folder.id });
        toast.success("Đã xoá");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Xoá thất bại");
      }
    });
  };

  return (
    <li className="group">
      <div
        className={cn(
          "flex items-center gap-2 rounded px-2 py-1.5 text-[13px] transition-colors",
          active ? "bg-primary/10 text-foreground" : "text-foreground hover:bg-muted/40"
        )}
      >
        <button
          type="button"
          onClick={onClick}
          className="flex flex-1 items-center gap-2 truncate text-left"
        >
          {active ? (
            <FolderOpen className="h-3.5 w-3.5 text-primary" strokeWidth={1.6} />
          ) : (
            <FolderClosed className="h-3.5 w-3.5" strokeWidth={1.6} />
          )}
          <span className="truncate">{folder.name}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{count}</span>
        </button>
        <div className="opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onRename}
            title="Đổi tên"
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
          </button>
          {!folder.isDefault && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending}
              title="Xoá"
              className="ml-0.5 rounded p-0.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function SealSubmitButton({ doc, matterId }: { doc: FolderDocument; matterId: string }) {
  function submitForSeal() {
    // Liên động mục 5 + mục 6: chuyển tới /seals?new=1&draftDocId=...&matterId=...
    const url = new URL("/approvals/seals", window.location.origin);
    url.searchParams.set("new", "1");
    url.searchParams.set("draftDocId", doc.id);
    url.searchParams.set("matterId", matterId);
    url.searchParams.set("documentTitle", doc.name);
    window.location.href = url.toString();
  }

  return (
    <button
      type="button"
      onClick={submitForSeal}
      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
      title="Gửi duyệt dùng dấu"
    >
      <Stamp className="h-3 w-3" />
      Gửi duyệt dùng dấu
    </button>
  );
}

function DocCard({ doc, matterId }: { doc: FolderDocument; matterId: string }) {
  const sizeLabel =
    doc.size && doc.size > 1024 * 1024
      ? `${(doc.size / 1024 / 1024).toFixed(1)} MB`
      : doc.size
        ? `${Math.round(doc.size / 1024)} KB`
        : "—";
  const dateLabel = new Date(doc.createdAt).toLocaleDateString("zh-CN");

  return (
    <div className="ll-surface rounded-lg border border-border p-3 transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium" title={doc.name}>
            {doc.name}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {sizeLabel} · {dateLabel}
            {doc.templateId && <span className="ml-1 text-primary">· Sinh từ mẫu</span>}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <a
          href={`/api/documents/${doc.id}/download`}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          title="Tải xuống"
        >
          <Download className="h-3 w-3" />
          Tải xuống
        </a>
        <SealSubmitButton doc={doc} matterId={matterId} />
      </div>
    </div>
  );
}

async function submitCreateFolder(matterId: string, name: string): Promise<boolean> {
  try {
    await createFolder({ matterId, name: name.trim() });
    toast.success("Đã tạo");
    return true;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Tạo thất bại");
    return false;
  }
}

function NewFolderDialog({
  open,
  onOpenChange,
  matterId
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
}) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      const ok = await submitCreateFolder(matterId, name);
      if (ok) {
        setName("");
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo hồ sơ</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên hồ sơ (tối đa 40 ký tự)"
          autoFocus
          maxLength={40}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={pending || !name.trim()}>
            Tạo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenameFolderDialog({
  folder,
  open,
  onOpenChange
}: {
  folder: FolderPayload;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [name, setName] = useState(folder.name);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!name.trim() || name === folder.name) {
      onOpenChange(false);
      return;
    }
    startTransition(async () => {
      try {
        await renameFolder({ id: folder.id, name: name.trim() });
        toast.success("Đã cập nhật");
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Cập nhật thất bại");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đổi tên hồ sơ</DialogTitle>
        </DialogHeader>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={pending || !name.trim()}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
