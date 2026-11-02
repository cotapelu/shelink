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

import { useEffect, useState } from "react";
import {
  Loader2,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  FileWarning,
  BookmarkPlus,
  Check,
  History,
  ChevronLeft
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { reviewDocument, type ReviewResult } from "@/server/ai/review-document";
import { saveReviewToMatter } from "@/server/ai/save-review";
import {
  listReviewHistory,
  getReviewRecord,
  type ReviewHistoryEntry
} from "@/server/ai/review-history";
import type {
  ReviewItem,
  ReviewType,
  ReviewSeverity
} from "@/lib/ai/review-parser";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  documentId: string | null;
  matterId: string;
  onOpenChange: (open: boolean) => void;
};

const typeMeta: Record<ReviewType, { label: string; Icon: typeof AlertTriangle; color: string }> = {
  MISSING: { label: "Yếu tố còn thiếu", Icon: FileWarning, color: "text-amber-600" },
  RISK: { label: "Rủi ro pháp lý", Icon: AlertTriangle, color: "text-rose-600" },
  ISSUE: { label: "Vấn đề điều khoản", Icon: AlertCircle, color: "text-orange-600" },
  SUGGESTION: { label: "Đề xuất tối ưu", Icon: Lightbulb, color: "text-sky-600" }
};

const sevStyle: Record<ReviewSeverity, { label: string; cls: string }> = {
  HIGH: { label: "Cao", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  MEDIUM: { label: "Trung bình", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  LOW: { label: "Thấp", cls: "bg-slate-50 text-slate-600 border-slate-200" }
};

const TYPE_ORDER: ReviewType[] = ["MISSING", "RISK", "ISSUE", "SUGGESTION"];

type View =
  | { kind: "list" } // Lịch sử + cửa vào kiểm tra mới
  | { kind: "result"; result: ReviewResult; isNew: boolean }
  | { kind: "history-detail"; entry: ReviewHistoryEntry; items: ReviewItem[]; documentName: string };

export function DocumentReviewDialog({
  open,
  documentId,
  matterId,
  onOpenChange
}: Props) {
  const [view, setView] = useState<View>({ kind: "list" });
  const [history, setHistory] = useState<ReviewHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Khi mở/đổi doc thì reset + kéo lịch sử
  useEffect(() => {
    if (!open || !documentId) return;
    let cancelled = false;
    setView({ kind: "list" });
    setHistory([]);
    setError(null);
    setSaved(false);
    setLoadingHistory(true);
    listReviewHistory({ documentId })
      .then((h) => {
        if (!cancelled) setHistory(h);
      })
      .catch(() => {
        // Tra lịch sử lỗi không chặn kiểm tra mới
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, documentId]);

  async function runNewReview() {
    if (!documentId) return;
    setReviewing(true);
    setError(null);
    try {
      const r = await reviewDocument({ documentId });
      setView({ kind: "result", result: r, isNew: true });
      setSaved(false);
      // Kéo lại lịch sử (kiểm tra mới đã ghi DB)
      listReviewHistory({ documentId }).then(setHistory).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kiểm tra AI thất bại");
    } finally {
      setReviewing(false);
    }
  }

  async function openHistoryDetail(entry: ReviewHistoryEntry) {
    try {
      const rec = await getReviewRecord({ recordId: entry.id });
      if (!rec) {
        toast.error("Bản ghi không tồn tại hoặc đã xoá");
        return;
      }
      setView({
        kind: "history-detail",
        entry,
        items: rec.items,
        documentName: rec.documentName
      });
      setSaved(false);
    } catch (err) {
      toast.error("Tải chi tiết lịch sử thất bại", {
        description: err instanceof Error ? err.message : ""
      });
    }
  }

  async function handleSave() {
    if (view.kind !== "result") return;
    setSaving(true);
    try {
      const res = await saveReviewToMatter({
        matterId,
        reviewedDocId: documentId!,
        reviewedDocName: view.result.documentName,
        items: view.result.items
      });
      setSaved(true);
      toast.success("Đã lưu kết quả kiểm tra vào vụ án", { description: res.documentName });
    } catch (err) {
      toast.error("Lưu thất bại", {
        description: err instanceof Error ? err.message : ""
      });
    } finally {
      setSaving(false);
    }
  }

  // Các items cần hiển thị hiện tại (list view không có nội dung)
  const currentItems: ReviewItem[] | null =
    view.kind === "result" ? view.result.items : view.kind === "history-detail" ? view.items : null;
  const currentDocName =
    view.kind === "result"
      ? view.result.documentName
      : view.kind === "history-detail"
        ? view.documentName
        : "";

  const grouped =
    currentItems !== null
      ? TYPE_ORDER.map((t) => ({
          type: t,
          items: currentItems.filter((i) => i.type === t)
        })).filter((g) => g.items.length > 0)
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            {view.kind !== "list" && (
              <button
                type="button"
                onClick={() => setView({ kind: "list" })}
                className="text-muted-foreground hover:text-foreground"
                title="Về danh sách"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <Sparkles className="h-4 w-4 text-violet-500" />
            Kiểm tra văn bản AI
          </DialogTitle>
          <DialogDescription className="text-xs">
            {view.kind === "list" && "Xem lịch sử hoặc bắt đầu kiểm tra mới"}
            {view.kind === "result" &&
              `${view.result.documentName}${view.result.truncated ? " (đã cắt 6000 chữ đầu)" : ""}`}
            {view.kind === "history-detail" &&
              `${currentDocName} · Lịch sử ${view.entry.reviewedAt.toLocaleString("vi-VN")}`}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {/* ====== List view ====== */}
          {view.kind === "list" && (
            <div className="space-y-4">
              <Button
                type="button"
                onClick={runNewReview}
                disabled={reviewing}
                className="w-full gap-1.5"
              >
                {reviewing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {history.length === 0 ? "Bắt đầu kiểm tra AI" : "Kiểm tra AI lại"}
              </Button>

              {error && (
                <div className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {error}
                </div>
              )}

              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <History className="h-3.5 w-3.5" />
                  Lịch sử kiểm tra
                  <span className="font-mono text-[10px]">
                    {loadingHistory ? "…" : history.length}
                  </span>
                </h4>
                {loadingHistory ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">Đang tải…</p>
                ) : history.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Chưa có bản ghi kiểm tra AI nào
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {history.map((h) => (
                      <li key={h.id}>
                        <button
                          type="button"
                          onClick={() => openHistoryDetail(h)}
                          className="flex w-full items-center justify-between gap-2 rounded border border-border bg-background px-3 py-2 text-left text-xs transition hover:border-foreground/30 hover:bg-muted/30"
                        >
                          <div className="flex flex-col">
                            <span className="font-mono text-foreground">
                              {h.reviewedAt.toLocaleString("zh-CN")}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {h.reviewedBy.name} · {h.itemCount} mục
                              {h.truncated ? " · Đã cắt" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {h.severityCounts.HIGH > 0 && (
                              <SevCount sev="HIGH" n={h.severityCounts.HIGH} />
                            )}
                            {h.severityCounts.MEDIUM > 0 && (
                              <SevCount sev="MEDIUM" n={h.severityCounts.MEDIUM} />
                            )}
                            {h.severityCounts.LOW > 0 && (
                              <SevCount sev="LOW" n={h.severityCounts.LOW} />
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ====== Result / history detail view ====== */}
          {currentItems !== null &&
            (currentItems.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {view.kind === "result" && view.isNew
                  ? "AI không phát hiện vấn đề rõ rệt (không có nghĩa là không có khuyết điểm, hãy nhờ luật sư kiểm tra lại)"
                  : "Lần kiểm tra này không có mục"}
              </div>
            ) : (
              <div className="space-y-5">
                {grouped.map((g) => {
                  const meta = typeMeta[g.type];
                  const Icon = meta.Icon;
                  return (
                    <section key={g.type}>
                      <h4
                        className={cn(
                          "mb-2 flex items-center gap-1.5 text-xs font-medium",
                          meta.color
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {g.items.length}
                        </span>
                      </h4>
                      <ul className="space-y-2">
                        {g.items.map((item, idx) => (
                          <ReviewItemRow key={idx} item={item} />
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            ))}
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-2.5">
          <span className="text-[11px] text-muted-foreground">
            {view.kind === "result"
              ? `Số ký tự phân tích: ${view.result.textPreviewChars}`
              : view.kind === "history-detail"
                ? `Số ký tự phân tích: ${view.entry.textPreviewChars}`
                : ""}
          </span>
          <div className="flex items-center gap-2">
            {view.kind === "result" && view.result.items.length > 0 && (
              saved ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-700">
                  <Check className="h-3 w-3" />
                  Đã lưu vào vụ án
                </span>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-1"
                >
                  {saving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <BookmarkPlus className="h-3 w-3" />
                  )}
                  Lưu vào vụ án
                </Button>
              )
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewItemRow({ item }: { item: ReviewItem }) {
  const sev = sevStyle[item.severity];
  return (
    <li className="rounded border border-border bg-background px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{item.title}</span>
        <span
          className={cn(
            "shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none",
            sev.cls
          )}
        >
          {sev.label}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-foreground/75">{item.detail}</p>
    </li>
  );
}

function SevCount({ sev, n }: { sev: ReviewSeverity; n: number }) {
  return (
    <span className={cn("rounded border px-1 py-0.5 text-[10px] leading-none", sevStyle[sev].cls)}>
      {sevStyle[sev].label}
      <span className="ml-0.5 font-mono">{n}</span>
    </span>
  );
}
