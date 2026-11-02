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

import { Hourglass, XCircle, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ArchiveStatus = "PENDING_REVIEW" | "REJECTED" | "APPROVED";

interface ArchiveRecord {
  id: string;
  archiveNo: string;
  status: ArchiveStatus;
  reviewedAt: Date | null;
  reviewNote: string | null;
  archivedBy: string;
  missingItems: string[];
}

interface Props {
  record: ArchiveRecord | null;
  onReArchive?: () => void;
}

export function ArchiveStatusBanner({ record, onReArchive }: Props) {
  if (!record || record.status === "APPROVED") return null;

  const isRejected = record.status === "REJECTED";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border px-4 py-3",
        isRejected
          ? "border-destructive/50 bg-destructive/10"
          : "border-[#9B7BF7]/50 bg-[#9B7BF7]/10"
      )}
    >
      <div className={cn("mt-0.5", isRejected ? "text-destructive" : "text-[#9B7BF7]")}>
        {isRejected ? <XCircle className="h-4 w-4" /> : <Hourglass className="h-4 w-4" />}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-medium", isRejected ? "text-destructive" : "text-[#9B7BF7]")}>
            {isRejected ? "Yêu cầu lưu trữ bị từ chối" : "Yêu cầu lưu trữ đang duyệt"}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              isRejected
                ? "border-destructive/50 text-destructive"
                : "border-[#9B7BF7]/50 text-[#9B7BF7]"
            )}
          >
            {record.archiveNo}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {isRejected
            ? record.reviewNote
              ? `Lý do từ chối: ${record.reviewNote}`
              : "Quản trị viên chưa ghi lý do từ chối"
            : "Đã gửi yêu cầu lưu trữ, hãy chờ quản trị viên duyệt. Duyệt xong vụ án sẽ chuyển sang chỉ đọc."}
        </div>
        {isRejected && record.missingItems.length > 0 && (
          <div className="text-[11px] text-muted-foreground">
            Hạng mục thiếu lần trước: {record.missingItems.join(", ")}
          </div>
        )}
      </div>
      {isRejected && onReArchive && (
        <button
          type="button"
          onClick={onReArchive}
          className="mt-0.5 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted/80"
        >
          <Archive className="h-3 w-3" />
          Lưu trữ lại
        </button>
      )}
    </div>
  );
}
