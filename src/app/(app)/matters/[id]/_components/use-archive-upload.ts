"use client";

import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { uploadDocument } from "@/server/documents/actions";
import type { ArchiveChecklistItem } from "@/lib/archive/checklists";
import { buildArchiveUploadFormData } from "./archive-wizard-helpers";

export interface ArchiveUpload {
  uploadingItemId: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  triggerUpload: (item: ArchiveChecklistItem) => void;
  handleFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

/** Lấy file + mục đang chờ từ event; reset input để chọn lại cùng 1 file vẫn fire change. */
function takePendingFile(
  e: React.ChangeEvent<HTMLInputElement>,
  pending: ArchiveChecklistItem | null
): { file: File; item: ArchiveChecklistItem } | null {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file || !pending) return null;
  return { file, item: pending };
}

/** Upload 1 file cho 1 mục checklist rồi nạp lại prep; báo trạng thái uploading. */
async function runChecklistUpload(args: {
  matterId: string;
  item: ArchiveChecklistItem;
  file: File;
  refreshPrep: () => Promise<void>;
  setUploadingItemId: (v: string | null) => void;
}): Promise<void> {
  const { matterId, item, file, refreshPrep, setUploadingItemId } = args;
  setUploadingItemId(item.id);
  try {
    await uploadDocument(buildArchiveUploadFormData({ matterId, item, file }));
    toast.success(`已上传：${item.label}`, { description: file.name });
    await refreshPrep();
  } catch (err) {
    toast.error("上传失败", { description: err instanceof Error ? err.message : "" });
  } finally {
    setUploadingItemId(null);
  }
}

/** Upload tài liệu cho mục checklist đang chờ (tách từ useArchiveWizard — AUTO-55). */
export function useArchiveUpload({
  matterId,
  refreshPrep
}: {
  matterId: string;
  refreshPrep: () => Promise<void>;
}): ArchiveUpload {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingItemRef = useRef<ArchiveChecklistItem | null>(null);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

  const triggerUpload = useCallback((item: ArchiveChecklistItem) => {
    pendingItemRef.current = item;
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = takePendingFile(e, pendingItemRef.current);
      pendingItemRef.current = null;
      if (!picked) return;
      await runChecklistUpload({ matterId, ...picked, refreshPrep, setUploadingItemId });
    },
    [matterId, refreshPrep]
  );

  return { uploadingItemId, fileInputRef, triggerUpload, handleFileSelected };
}
