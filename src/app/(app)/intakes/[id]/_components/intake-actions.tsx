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
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ArrowRight, XCircle, Loader2, Clock, RotateCcw, AlertCircle } from "lucide-react";
import type { IntakeStatus } from "@prisma/client";
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
  declineIntake,
  convertIntakeToMatter,
  markIntakeNeedsRevision,
  resubmitIntake
} from "@/server/intakes/actions";

export function IntakeActions({
  intakeId,
  status
}: {
  intakeId: string;
  status?: IntakeStatus;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [dialogKind, setDialogKind] = useState<"decline" | "revision" | null>(null);
  const [reason, setReason] = useState("");

  const role = session?.user?.role;
  const canApprove = role === "ADMIN" || role === "PRINCIPAL_LAWYER";

  // Phía luật sư: trạng thái chờ bổ sung → hiện nút "gửi lại"
  function handleResubmit() {
    if (!confirm("Xác nhận gửi lại duyệt?")) return;
    startTransition(async () => {
      try {
        await resubmitIntake(intakeId);
        toast.success("Đã gửi lại duyệt");
        router.refresh();
      } catch (err) {
        toast.error("Thao tác thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  if (status === "NEEDS_REVISION") {
    return (
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700">
          <AlertCircle className="h-3.5 w-3.5" />
          Chờ bổ sung: bù đủ tài liệu có thể gửi lại
        </div>
        <Button size="sm" onClick={handleResubmit} disabled={isPending} className="gap-1.5">
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          Gửi lại
        </Button>
      </div>
    );
  }

  if (!canApprove) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        Chờ quản trị viên/luật sư chính duyệt
      </div>
    );
  }

  function handleConvert() {
    if (!confirm("Xác nhận chuyển thành vụ án chính thức? Sẽ chiếm một mã vụ án.")) return;
    startTransition(async () => {
      try {
        const res = await convertIntakeToMatter(intakeId);
        toast.success(`Đã chuyển thành vụ án ${res.internalCode}`);
        router.push(`/matters/${res.matterId}`);
      } catch (err) {
        toast.error("Chuyển đổi thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  function openDialog(kind: "decline" | "revision") {
    setReason("");
    setDialogKind(kind);
  }

  function handleConfirm() {
    if (!reason.trim()) {
      toast.warning(dialogKind === "decline" ? "Hãy nhập lý do không tiếp nhận" : "Hãy nhập diễn giải bổ sung");
      return;
    }
    startTransition(async () => {
      try {
        if (dialogKind === "decline") {
          await declineIntake({ id: intakeId, reason });
          toast.success("Đã đánh dấu không tiếp nhận");
        } else {
          await markIntakeNeedsRevision({ id: intakeId, reason });
          toast.success("Đã đánh dấu chờ bổ sung, luật sư bù xong có thể gửi lại");
        }
        setDialogKind(null);
        router.refresh();
      } catch (err) {
        toast.error("Thao tác thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  const isDecline = dialogKind === "decline";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog("revision")}
          disabled={isPending}
          className="border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
        >
          <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
          Cần bổ sung
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog("decline")}
          disabled={isPending}
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          <XCircle className="mr-1.5 h-3.5 w-3.5" />
          Không tiếp nhận
        </Button>
        <Button
          size="sm"
          onClick={handleConvert}
          disabled={isPending}
          className="gap-1.5"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowRight className="h-3.5 w-3.5" />
          )}
          Chuyển thành vụ án chính thức
        </Button>
      </div>

      <Dialog open={dialogKind !== null} onOpenChange={(o) => !o && setDialogKind(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isDecline ? "Đánh dấu không tiếp nhận" : "Đánh dấu chờ bổ sung"}</DialogTitle>
            <DialogDescription>
              {isDecline
                ? "Trạng thái cuối: tiếp nhận này sẽ không chuyển thành vụ án chính thức nữa. Vẫn giữ trong lịch sử."
                : "Luật sư bù đủ tài liệu có thể bấm「gửi lại duyệt」, khác với không tiếp nhận thật sự."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-xs">
              {isDecline ? "Lý do không tiếp nhận" : "Mục cần bổ sung"} *
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isDecline
                  ? "vd: có xung đột chặn với khách hiện có / khách đã rút / ngoài phạm vi nghiệp vụ..."
                  : "vd: thiếu bản scan giấy tờ / hợp đồng ủy quyền chưa ký / diễn giải xung đột lợi ích chưa đầy đủ..."
              }
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogKind(null)} disabled={isPending}>
              Huỷ
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPending || !reason.trim()}
              variant={isDecline ? "destructive" : "default"}
            >
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {isDecline ? "Xác nhận không tiếp nhận" : "Đánh dấu chờ bổ sung"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
