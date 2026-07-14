"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Paperclip, FileText, X, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DocumentsSectionProps {
  contracts: File[];
  onContractsChange: (files: File[]) => void;
  ocrPending: boolean;
  onOcrPendingChange: (pending: boolean) => void;
  onPleadingFile: (file: File) => Promise<void>;
  maxFileSizeMB?: number;
}

export function DocumentsSection({
  contracts,
  onContractsChange,
  ocrPending,
  onOcrPendingChange,
  onPleadingFile,
  maxFileSizeMB = 20
}: DocumentsSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const pleadingRef = useRef<HTMLInputElement>(null);

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const maxBytes = maxFileSizeMB * 1024 * 1024;
    const arr = Array.from(list).filter((f) => f.size <= maxBytes);
    if (arr.length < list.length) {
      toast.warning(`跳过了超过 ${maxFileSizeMB}MB 的文件`);
    }
    onContractsChange([...contracts, ...arr]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handlePleadingFile(file: File) {
    onOcrPendingChange(true);
    try {
      await onPleadingFile(file);
    } finally {
      onOcrPendingChange(false);
      if (pleadingRef.current) pleadingRef.current.value = "";
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-ll-low">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2.5">
          <span className="flex h-5 min-w-5 items-center justify-center rounded-sm bg-primary/10 px-1.5 text-[0.68rem] font-semibold text-primary">
            IV
          </span>
          <span className="text-base font-semibold tracking-tight">
            Hợp đồng ủy quyền / Tài liệu liên quan
            <span className="ml-1 text-destructive">*</span>
          </span>
        </h3>
        <>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="h-7 gap-1"
          >
            <Paperclip className="h-3 w-3" />
            Thêm
          </Button>
        </>
      </div>
      <div className="space-y-3.5">
        {contracts.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-background py-3 text-center text-xs text-muted-foreground">
            上传委托代理合同、授权委托书等（加密存储，单文件 ≤ {maxFileSizeMB}MB）
          </p>
        ) : (
          <ul className="space-y-1.5">
            {contracts.map((f, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs"
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="flex-1 truncate">{f.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground tabular">
                  {(f.size / 1024).toFixed(0)} KB
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const next = contracts.filter((_, j) => j !== i);
                    onContractsChange(next);
                  }}
                  className="h-5 w-5 p-0 text-destructive"
                >
                  <X className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {/* OCR upload */}
        <div className="rounded-md border border-dashed border-primary/40 bg-primary/[0.03] p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              <div className="font-medium text-foreground">
                <ScanLine className="mr-1 inline h-3 w-3 text-primary" />
                识别起诉状 / 申请书
              </div>
              <p className="mt-0.5">
                我方为被动方，可上传相对方起诉状 / 申请书（JPG / PNG / WebP / PDF，≤ {maxFileSizeMB}MB），AI 自动抽取相对方主体与诉求
              </p>
            </div>
            <input
              ref={pleadingRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePleadingFile(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => pleadingRef.current?.click()}
              disabled={ocrPending}
              className="h-7 shrink-0 gap-1"
            >
              {ocrPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ScanLine className="h-3 w-3" />
              )}
              上传识别
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
