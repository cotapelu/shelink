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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Archive,
  Pause,
  Play,
  Loader2,
  MoreHorizontal,
  Lock,
  Download
} from "lucide-react";
import type { MatterStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  closeMatter,
  reopenMatter,
  holdMatter
} from "@/server/matters/lifecycle";
import { ArchiveWizardDialog } from "./archive-wizard";

export function LifecycleActions({
  matterId,
  status,
  canArchive
}: {
  matterId: string;
  status: MatterStatus;
  canArchive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"close" | "hold" | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [text, setText] = useState("");

  const isArchived = status === "ARCHIVED";

  function open(d: "close" | "hold") {
    setText("");
    setDialog(d);
  }

  function handleSubmit() {
    if (dialog === "close" && !text.trim()) {
      toast.warning("Hãy nhập tóm tắt kết thúc");
      return;
    }
    startTransition(async () => {
      try {
        if (dialog === "close") {
          await closeMatter({ id: matterId, summary: text });
          toast.success("Vụ án đã kết thúc");
        } else if (dialog === "hold") {
          await holdMatter({ id: matterId, reason: text });
          toast.success("Vụ án đã tạm dừng");
        }
        setDialog(null);
        router.refresh();
      } catch (err) {
        toast.error("Thao tác thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  function handleReopen() {
    if (!confirm("Mở lại vụ án về trạng thái 'đang xử lý'?")) return;
    startTransition(async () => {
      try {
        await reopenMatter(matterId);
        toast.success("Vụ án đã mở lại");
        router.refresh();
      } catch (err) {
        toast.error("Thao tác thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  if (isArchived) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#9B7BF7]/30 bg-[#9B7BF7]/10 px-3 py-1.5 text-xs text-[#9B7BF7]">
          <Lock className="h-3.5 w-3.5" />
          Đã lưu trữ (chỉ đọc)
        </span>
        <a
          href={`/api/archive/${matterId}/export`}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs hover:bg-muted/30"
          title="Xuất ZIP lưu trữ (gồm tài liệu + dữ liệu có cấu trúc + bìa và mục lục hồ sơ)"
        >
          <Download className="h-3.5 w-3.5" />
          Xuất ZIP
        </a>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isPending} className="gap-1.5">
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
            Trạng thái
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {(status === "ON_HOLD" || status === "CLOSED") && (
            <DropdownMenuItem onSelect={handleReopen}>
              <Play className="mr-2 h-4 w-4" />
              Mở lại
            </DropdownMenuItem>
          )}
          {status === "IN_PROGRESS" && (
            <DropdownMenuItem onSelect={() => open("hold")}>
              <Pause className="mr-2 h-4 w-4" />
              Tạm dừng xử lý
            </DropdownMenuItem>
          )}
          {status !== "CLOSED" && (
            <DropdownMenuItem onSelect={() => open("close")}>
              <CheckCircle2 className="mr-2 h-4 w-4 text-[#4ADE80]" />
              Kết thúc
            </DropdownMenuItem>
          )}
          {canArchive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setArchiveOpen(true)}
                className="text-[#9B7BF7] focus:text-[#9B7BF7]"
              >
                <Archive className="mr-2 h-4 w-4" />
                Lưu trữ (không hoàn tác được)
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "close" ? "Kết thúc" : "Tạm dừng vụ án"}</DialogTitle>
            <DialogDescription>
              {dialog === "close" &&
                "Sau khi kết thúc, trạng thái vụ án là 'đã kết thúc', vẫn sửa được. Tóm tắt kết thúc sẽ vào dòng thời gian."}
              {dialog === "hold" && "Sau khi tạm dừng, vụ án không còn hiện ở lọc 'đang xử lý'."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label className="text-xs">
              {dialog === "close" ? "Tóm tắt kết thúc" : "Lý do tạm dừng"}
              {dialog === "close" && <span className="ml-1 text-destructive">*</span>}
            </Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                dialog === "close"
                  ? "vd: bản án sơ thẩm chấp nhận yêu cầu của nguyên đơn, bên kia không kháng cáo, bản án đã có hiệu lực"
                  : "vd: chờ khách bổ sung tài liệu chứng cứ"
              }
              rows={5}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={isPending}>
              Huỷ
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {dialog === "close" ? "Xác nhận kết thúc" : "Xác nhận tạm dừng"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ArchiveWizardDialog
        matterId={matterId}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
      />
    </>
  );
}
