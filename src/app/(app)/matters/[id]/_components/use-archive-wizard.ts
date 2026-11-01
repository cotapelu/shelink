"use client";

import { useState, useTransition, useCallback } from "react";
import { toast } from "sonner";
import { archiveMatter } from "@/server/archive/actions";
import type { ArchiveClosedReason } from "@prisma/client";
import { useArchivePrep, type LinkedDoc } from "./use-archive-prep";
import { useArchiveUpload } from "./use-archive-upload";
import { computeMissingRequired } from "./archive-wizard-helpers";

export type { LinkedDoc };

interface UseArchiveWizardProps {
  matterId: string;
}

const ARCHIVE_DONE_DESC = "卷宗封皮 + 目录已自动生成至归档卷宗";

/** Thông báo theo kết quả lưu trữ (thuần). */
function archiveResultMessage(result: { status: string; archiveNo: string }): string {
  return result.status === "APPROVED"
    ? `案件已归档（${result.archiveNo}）`
    : `归档申请已提交（${result.archiveNo}），等待管理员审批`;
}

/** Gọi archiveMatter + thông báo kết quả (tách khỏi hook — AUTO-55). */
async function runArchiveSubmit(args: {
  matterId: string;
  summary: string;
  closedReason: ArchiveClosedReason;
  completedAt: string;
  checked: Record<string, boolean>;
  forceWithMissing: boolean;
}): Promise<void> {
  const { matterId, summary, closedReason, completedAt, checked, forceWithMissing } = args;
  try {
    const result = await archiveMatter({
      matterId,
      summary,
      closedReason,
      completedAt: new Date(completedAt),
      judgmentSummary: "",
      checklist: checked,
      forceWithMissing
    });
    toast.success(archiveResultMessage(result), { description: ARCHIVE_DONE_DESC });
  } catch (err) {
    toast.error("归档失败", { description: err instanceof Error ? err.message : "" });
  }
}

/**
 * Wizard lưu trữ: ghép prep (nạp + tự tích checkbox) + upload + trạng thái form + submit.
 * Tách từ hook 135 dòng thành sub-hook (R-refactor AUTO-55) — API trả về giữ nguyên.
 */
export function useArchiveWizard({ matterId }: UseArchiveWizardProps) {
  const {
    loading,
    checklist,
    checked,
    linkedDocs,
    completedAt,
    summary,
    setCompletedAt,
    setSummary,
    refreshPrep
  } = useArchivePrep({ matterId });

  const { uploadingItemId, fileInputRef, triggerUpload, handleFileSelected } = useArchiveUpload({
    matterId,
    refreshPrep
  });

  const [closedReason, setClosedReason] = useState<ArchiveClosedReason>("JUDGMENT" as ArchiveClosedReason);
  const [forceWithMissing, setForceWithMissing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const missingRequired = computeMissingRequired(checklist, checked);

  const handleSubmit = useCallback(() => {
    if (!summary.trim()) {
      toast.warning("请填写结案小结");
      return;
    }
    if (missingRequired.length > 0 && !forceWithMissing) {
      toast.warning(`仍有 ${missingRequired.length} 项必交材料未勾选`, {
        description: "如确实无法补齐，请勾选下方的'强制归档（缺项记录在档）'"
      });
      return;
    }
    startTransition(() =>
      runArchiveSubmit({ matterId, summary, closedReason, completedAt, checked, forceWithMissing })
    );
  }, [matterId, summary, closedReason, completedAt, checked, forceWithMissing, missingRequired.length]);

  return {
    loading,
    checklist,
    checked,
    linkedDocs,
    closedReason,
    completedAt,
    summary,
    setSummary,
    setClosedReason,
    setCompletedAt,
    forceWithMissing,
    setForceWithMissing,
    isPending,
    fileInputRef,
    uploadingItemId,
    triggerUpload,
    handleFileSelected,
    missingRequired,
    handleSubmit,
    refreshPrep
  };
}
