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

import { useState } from "react";
import Link from "next/link";
import { Loader2, Stamp, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SealRequestSheet } from "@/app/(app)/approvals/seals/_components/seal-request-sheet";
import type { SealTypeConfigRow } from "@/app/(app)/approvals/seals/_components/seal-types";
import { listSealTypeConfigs } from "@/server/seals/actions";
import type { SealContractItem } from "./info-extras";

type Filter = "all" | "pending" | "done";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Đang duyệt" },
  { value: "done", label: "Đã duyệt" }
];

/**
 * v0.13: Khu "duyệt" ở chi tiết vụ án (không còn là tab riêng, nhúng trong thông tin cơ bản)
 * - Chỉ hiển thị duyệt dùng dấu (cửa vào yêu cầu xuất HĐ đã thu về khu tài chính, không lặp lại ở đây)
 * - Chuyển 3 phân loại đầu trang: Tất cả / Đang duyệt / Đã duyệt
 * - v0.23: "bắt đầu duyệt" đầu trang đổi thành popup, tự khoá vụ án hiện tại + hỗ trợ "+ dấu người đại diện theo pháp luật"
 */
export function ApprovalsPanel({
  matterId,
  matterTitle,
  sealContracts,
  canRequest
}: {
  matterId: string;
  matterTitle: string;
  sealContracts: SealContractItem[];
  canRequest: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [configs, setConfigs] = useState<SealTypeConfigRow[] | null>(null);
  const [loadingConfigs, setLoadingConfigs] = useState(false);

  const filtered = sealContracts.filter((s) => {
    if (filter === "all") return true;
    if (filter === "pending") return s.status === "PENDING";
    return s.status === "APPROVED" || s.status === "STAMPED" || s.status === "REJECTED" || s.status === "CANCELLED";
  });

  async function handleOpenSheet() {
    if (configs) {
      setSheetOpen(true);
      return;
    }
    setLoadingConfigs(true);
    try {
      const list = await listSealTypeConfigs();
      setConfigs(list);
      setSheetOpen(true);
    } finally {
      setLoadingConfigs(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[13px] font-medium">
            <Stamp className="h-3.5 w-3.5 text-primary" />
            Duyệt dùng dấu
            <span className="ml-1 font-mono text-[11px] text-muted-foreground tabular">
              {sealContracts.length}
            </span>
          </span>
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] transition-colors",
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
                {f.value === "pending" && sealContracts.some((s) => s.status === "PENDING") && (
                  <span className="ml-1 font-mono text-[10px]">
                    {sealContracts.filter((s) => s.status === "PENDING").length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        {canRequest && (
          <Button
            size="sm"
            type="button"
            onClick={handleOpenSheet}
            disabled={loadingConfigs}
            className="h-6 gap-0.5 px-2 text-[11px]"
          >
            {loadingConfigs ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <Plus className="h-2.5 w-2.5" />
            )}
            Bắt đầu duyệt
          </Button>
        )}
      </header>

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          {filter === "all" ? "Chưa có duyệt nào" : filter === "pending" ? "Không có mục đang duyệt" : "Không có mục đã duyệt"}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 px-4 py-2 text-[12.5px]"
            >
              <span className="font-mono text-[11px] text-muted-foreground">{s.code}</span>
              <span className="min-w-0 flex-1 truncate">{s.documentTitle}</span>
              <SealStatusBadge status={s.status} />
              <Link
                href={`/approvals/seals?id=${s.id}`}
                className="text-[11px] text-primary hover:text-primary/80"
              >
                Chi tiết
              </Link>
            </li>
          ))}
        </ul>
      )}

      {configs && canRequest && (
        <SealRequestSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          configs={configs}
          matters={[{ id: matterId, internalCode: "", title: matterTitle }]}
          preset={{ matterId, documentTitle: matterTitle }}
        />
      )}
    </section>
  );
}

const SEAL_STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  STAMPED: "Đã đóng dấu",
  REJECTED: "Từ chối",
  CANCELLED: "Thu hồi"
};

function SealStatusBadge({ status }: { status: string }) {
  const tone =
    status === "APPROVED" || status === "STAMPED"
      ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20"
      : status === "REJECTED" || status === "CANCELLED"
        ? "text-red-700 bg-red-500/10 border-red-500/20"
        : "text-amber-700 bg-amber-500/10 border-amber-500/20";
  return (
    <Badge variant="outline" className={cn("h-5 border px-1.5 text-[10px]", tone)}>
      {SEAL_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
