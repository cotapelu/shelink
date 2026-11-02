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

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Download,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  Loader2,
  ScanLine
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { createExpress } from "@/server/express/actions";
import { parseExpressLabel } from "@/server/ai/parse-express";

type DocLite = { id: string; name: string; size: number | null; createdAt: Date };

export type SealContractItem = {
  id: string;
  code: string;
  documentTitle: string;
  status: string;
  createdAt: Date;
  draftDoc: DocLite;
  stampedDoc: DocLite | null;
};

type ContractRow = {
  kind: "intake" | "draft" | "stamped";
  label: string;
  doc: DocLite;
  sealCode?: string;
};

export function ContractsCard({
  intakeContracts,
  sealContracts
}: {
  intakeContracts: DocLite[];
  sealContracts: SealContractItem[];
}) {
  const rows: ContractRow[] = [
    ...intakeContracts.map((d) => ({
      kind: "intake" as const,
      label: "Tải lên khi tiếp nhận",
      doc: d
    })),
    ...sealContracts.flatMap((sr): ContractRow[] => {
      const arr: ContractRow[] = [
        {
          kind: "draft",
          label: "Yêu cầu dùng dấu",
          doc: sr.draftDoc,
          sealCode: sr.code
        }
      ];
      if (sr.stampedDoc) {
        arr.push({
          kind: "stamped",
          label: "Bản scan sau đóng dấu",
          doc: sr.stampedDoc,
          sealCode: sr.code
        });
      }
      return arr;
    })
  ];

  return (
    <section className="ll-surface rounded-lg border border-border p-4">
      <header className="mb-3 flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
        <span className="text-[15px]">Hợp đồng ủy quyền / tệp đính kèm</span>
        <span className="font-mono text-[11px] text-muted-foreground tabular">
          {rows.length}
        </span>
      </header>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Chưa có hợp đồng hoặc tệp dùng dấu
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li
              key={`${r.kind}-${r.doc.id}`}
              className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
            >
              <span
                className={cn(
                  "inline-flex h-7 items-center rounded-sm px-2 text-[10px] font-medium",
                  r.kind === "intake"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : r.kind === "draft"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      : "bg-primary/10 text-primary"
                )}
              >
                {r.label}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.82rem] font-medium">{r.doc.name}</div>
                <div className="font-mono text-[10px] tabular text-muted-foreground">
                  {r.sealCode ? `${r.sealCode} · ` : ""}
                  {r.doc.size ? `${(r.doc.size / 1024).toFixed(0)} KB · ` : ""}
                  {new Date(r.doc.createdAt).toLocaleDateString("zh-CN")}
                </div>
              </div>
              <a
                href={`/api/documents/${r.doc.id}/download`}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground transition-colors hover:text-primary"
                aria-label="Tải xuống"
              >
                <Download className="h-4 w-4" strokeWidth={1.6} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export type ExpressItem = {
  id: string;
  trackingNo: string;
  companyCode: string | null;
  direction: "OUTBOUND" | "INBOUND";
  purpose: string;
  lastState: string | null;
  lastUpdateAt: Date | null;
  createdAt: Date;
};

export function ExpressMiniCard({
  expresses,
  matterId
}: {
  expresses: ExpressItem[];
  matterId?: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  return (
    <section className="ll-surface h-full rounded-lg border border-border">
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="flex items-center gap-1.5 text-[13px] font-medium">
          <Package className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
          Bản ghi chuyển phát
          <span className="ml-1 font-mono text-[11px] text-muted-foreground tabular">
            {expresses.length}
          </span>
        </span>
        <div className="flex items-center gap-2">
          {matterId && (
            <Button size="sm" onClick={() => setAddOpen(true)} className="h-6 gap-0.5 px-2 text-[11px]">
              <Plus className="h-2.5 w-2.5" />
              Thêm
            </Button>
          )}
          <Link
            href="/express"
            className="text-[11px] text-muted-foreground transition-colors hover:text-primary"
          >
            Tất cả →
          </Link>
        </div>
      </header>
      {expresses.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Chưa có bản ghi chuyển phát</p>
      ) : (
        <ul className="space-y-1.5">
          {expresses.slice(0, 6).map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
            >
              {e.direction === "OUTBOUND" ? (
                <ArrowUpFromLine className="h-3.5 w-3.5 shrink-0 text-orange-600" strokeWidth={1.8} />
              ) : (
                <ArrowDownToLine className="h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={1.8} />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.82rem]">{e.purpose}</div>
                <div className="font-mono text-[10px] tabular text-muted-foreground">
                  {e.companyCode ?? "—"} · {e.trackingNo}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-foreground/80">{e.lastState ?? "—"}</div>
                <div className="font-mono text-[10px] tabular text-muted-foreground">
                  {e.lastUpdateAt
                    ? new Date(e.lastUpdateAt).toLocaleDateString("zh-CN")
                    : new Date(e.createdAt).toLocaleDateString("zh-CN")}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {matterId && (
        <AddExpressDialog open={addOpen} onOpenChange={setAddOpen} matterId={matterId} />
      )}
    </section>
  );
}

/**
 * v0.27: Dialog thêm bản ghi chuyển phát
 *
 * - Mã vận đơn: nhập tay / tải ảnh vận đơn OCR tự điền
 * - Mục đích bắt buộc; hướng mặc định OUTBOUND; matter đã gắn
 * - Sau khi gửi gọi createExpress (bên trong tự detectCompany + trackExpress kéo lộ trình đầu tiên)
 */
function AddExpressDialog({
  open,
  onOpenChange,
  matterId
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
}) {
  const router = useRouter();
  const [trackingNo, setTrackingNo] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [direction, setDirection] = useState<"OUTBOUND" | "INBOUND">("OUTBOUND");
  const [purpose, setPurpose] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [submitting, startSubmit] = useTransition();
  const [ocrPending, startOcr] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTrackingNo("");
    setCompanyCode("");
    setDirection("OUTBOUND");
    setPurpose("");
    setRecipient("");
    setRecipientPhone("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleOcr(file: File) {
    startOcr(async () => {
      try {
        const fd = new FormData();
        fd.set("file", file);
        const r = await parseExpressLabel(fd);
        if (r.trackingNo) {
          setTrackingNo(r.trackingNo);
          toast.success(`Đã nhận diện mã vận đơn: ${r.trackingNo}`);
        } else {
          toast.warning("Không nhận diện được mã vận đơn, hãy nhập tay");
        }
        if (r.companyCode) setCompanyCode(r.companyCode);
      } catch (err) {
        toast.error("Nhận diện thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  function handleSubmit() {
    if (!trackingNo.trim()) {
      toast.error("Hãy điền hoặc nhận diện mã vận đơn");
      return;
    }
    if (!purpose.trim()) {
      toast.error("Hãy điền mục đích");
      return;
    }
    startSubmit(async () => {
      try {
        await createExpress({
          trackingNo: trackingNo.trim(),
          companyCode: companyCode.trim(),
          direction,
          matterId,
          purpose: purpose.trim(),
          recipient: recipient.trim(),
          recipientPhone: recipientPhone.trim()
        });
        toast.success("Đã tạo bản ghi chuyển phát");
        reset();
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error("Tạo thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm bản ghi chuyển phát</DialogTitle>
          <DialogDescription className="text-xs">
            Có thể tải ảnh phiếu gửi để tự nhận diện mã vận đơn, hoặc nhập tay.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Mã vận đơn</Label>
            <div className="flex gap-1">
              <Input
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                placeholder="Nhập tay hoặc tải ảnh để nhận diện"
                className="font-mono"
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleOcr(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={ocrPending}
                className="h-9 shrink-0 gap-1"
                title="Tải ảnh phiếu gửi, AI tự nhận diện mã vận đơn + hãng chuyển phát"
              >
                {ocrPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ScanLine className="h-3 w-3" />
                )}
                Nhận diện
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Hãng chuyển phát</Label>
              <Input
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                placeholder="Để trống thì tự nhận diện"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hướng</Label>
              <Select
                value={direction}
                onValueChange={(v) => setDirection(v as "OUTBOUND" | "INBOUND")}
              >
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OUTBOUND">Gửi đi (ta → ngoài)</SelectItem>
                  <SelectItem value="INBOUND">Nhận về (ngoài → ta)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Mục đích *</Label>
            <Input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="vd: gửi đơn khởi kiện cho Toà Triều Dương"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Người nhận / đơn vị</Label>
              <Input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Điện thoại người nhận</Label>
              <Input
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Lưu và theo dõi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
