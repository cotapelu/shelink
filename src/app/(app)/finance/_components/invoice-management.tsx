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

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  Download,
  FileCheck2,
  FileText,
  X
} from "lucide-react";
import type { InvoiceRequestStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  invoiceRequestStatusLabel,
  invoiceRequestStatusColor
} from "@/lib/enums";
import { formatCurrency, cn } from "@/lib/utils";
import { approveInvoiceRequest, rejectInvoiceRequest } from "@/server/invoices/invoice-approval-actions";
import { recognizeInvoiceFromImage, type RecognizedInvoice } from "@/server/ai/actions";
import type { InvoiceRequestRow } from "./finance-view";

const STATUS_TABS: { key: InvoiceRequestStatus | "ALL"; label: string }[] = [
  { key: "PENDING", label: "Chờ xử lý" },
  { key: "ISSUED", label: "Đã xuất HĐ" },
  { key: "REJECTED", label: "Đã từ chối" },
  { key: "ALL", label: "Tất cả" }
];

const INVOICE_TYPE_LABEL = {
  PLAIN: "Hóa đơn thường",
  SPECIAL: "Hóa đơn GTGT"
} as const;

const INVOICE_ITEM_LABEL = {
  LAWYER_FEE: "Phí luật sư",
  CONSULTING_FEE: "Phí tư vấn",
  AGENCY_FEE: "Phí đại diện",
  OTHER: "Dịch vụ pháp lý khác"
} as const;

export function InvoiceManagementSection({
  requests,
  canApprove
}: {
  requests: InvoiceRequestRow[];
  canApprove: boolean;
}) {
  const [filter, setFilter] = useState<InvoiceRequestStatus | "ALL">("PENDING");
  const [processOpen, setProcessOpen] = useState<InvoiceRequestRow | null>(null);
  const [rejectOpen, setRejectOpen] = useState<InvoiceRequestRow | null>(null);

  const filtered = requests.filter((r) => filter === "ALL" || r.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {STATUS_TABS.map((t) => {
          const count =
            t.key === "ALL"
              ? requests.length
              : requests.filter((r) => r.status === t.key).length;
          const active = filter === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-popover/50 hover:text-foreground"
              )}
            >
              {t.label}
              <span className="font-mono text-[10px] tabular opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <section className="rounded-xl border border-border bg-muted/30">
        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            <Receipt className="mx-auto mb-2 h-5 w-5 opacity-50" />
            Không có yêu cầu xuất hóa đơn nào khớp
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((r) => {
              const color = invoiceRequestStatusColor[r.status];
              const Icon =
                r.status === "PENDING"
                  ? Clock
                  : r.status === "ISSUED" || r.status === "APPROVED"
                    ? CheckCircle2
                    : XCircle;
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-popover/30"
                >
                  <span
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium"
                    style={{ borderColor: `${color}50`, color }}
                  >
                    <Icon className="h-3 w-3" />
                    {invoiceRequestStatusLabel[r.status]}
                  </span>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base tabular font-semibold text-foreground">
                        {formatCurrency(Number(r.amount))}
                      </span>
                      {r.title && (
                        <span className="text-sm text-muted-foreground">· {r.title}</span>
                      )}
                    </div>
                    {r.matter ? (
                      <Link
                        href={`/matters/${r.matter.id}`}
                        className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      >
                        <span className="font-mono">{r.matter.internalCode}</span>
                        <span>·</span>
                        <span className="truncate">{r.matter.title}</span>
                      </Link>
                    ) : (
                      <div className="mt-0.5 text-xs text-amber-600" title={r.noMatterReason ?? ""}>
                        Không liên kết vụ án{r.noMatterReason ? ` · ${r.noMatterReason}` : ""}
                      </div>
                    )}
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Người yêu cầu: {r.requestedBy.name} ·{" "}
                      {new Date(r.requestedAt).toLocaleString("vi-VN", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                      {r.requestNote && <> · Ghi chú: {r.requestNote}</>}
                    </div>
                    {/* v0.42 Thông tin hóa đơn (6 yếu tố hóa đơn GTGT để kế toán mở trực tiếp) */}
                    {(r.buyerName || r.invoiceType) && (
                      <div className="mt-1 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                        <div>
                          <span className="text-foreground/70">
                            {r.invoiceType ? INVOICE_TYPE_LABEL[r.invoiceType] : "Hóa đơn"}
                          </span>
                          {r.invoiceItem && <> · Khoản mục: {INVOICE_ITEM_LABEL[r.invoiceItem]}</>}
                          {r.buyerName && <> · Đơn vị mua: {r.buyerName}</>}
                          {r.buyerTaxNo && (
                            <> · Mã số thuế: <span className="font-mono">{r.buyerTaxNo}</span></>
                          )}
                        </div>
                        {r.invoiceType === "SPECIAL" &&
                          (r.buyerBank ||
                            r.buyerBankAccount ||
                            r.buyerAddress ||
                            r.buyerPhone) && (
                            <div className="mt-0.5">
                              {r.buyerAddress && <>Địa chỉ: {r.buyerAddress}　</>}
                              {r.buyerPhone && <>Điện thoại: {r.buyerPhone}　</>}
                              {r.buyerBank && <>Ngân hàng: {r.buyerBank}　</>}
                              {r.buyerBankAccount && (
                                <>Số tài khoản: <span className="font-mono">{r.buyerBankAccount}</span></>
                              )}
                            </div>
                          )}
                      </div>
                    )}
                    {r.evidenceDocs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.evidenceDocs.map((doc) => (
                          <a
                            key={doc.id}
                            href={`/api/documents/${doc.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-64 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="truncate">{doc.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                    {r.processNote && (
                      <div className="mt-1 text-[11px] text-destructive/80">
                        Ghi chú kế toán: {r.processNote}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.contractScan && (
                      <a
                        href={`/api/documents/${r.contractScan.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        <FileCheck2 className="h-3 w-3" />
                        Hợp đồng cũ
                      </a>
                    )}
                    {r.invoiceFile && (
                      <a
                        href={`/api/documents/${r.invoiceFile.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/15 px-2 py-1 text-[11px] text-primary"
                      >
                        <Download className="h-3 w-3" />
                        Hóa đơn điện tử
                      </a>
                    )}
                    {canApprove && r.status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectOpen(r)}
                          className="h-7 border-destructive/40 text-destructive hover:bg-destructive/10"
                        >
                          Từ chối
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setProcessOpen(r)}
                          className="h-7"
                        >
                          Xử lý
                        </Button>
                      </>
                    )}
                    {canApprove && r.status === "APPROVED" && (
                      <Button size="sm" onClick={() => setProcessOpen(r)} className="h-7">
                        Bù hóa đơn
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {processOpen && (
        <ProcessDialog
          request={processOpen}
          open={!!processOpen}
          onOpenChange={(o) => !o && setProcessOpen(null)}
        />
      )}
      {rejectOpen && (
        <RejectDialog
          request={rejectOpen}
          open={!!rejectOpen}
          onOpenChange={(o) => !o && setRejectOpen(null)}
        />
      )}
    </div>
  );
}

function ProcessDialog({
  request,
  open,
  onOpenChange
}: {
  request: InvoiceRequestRow;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [invoiceNo, setInvoiceNo] = useState(request.invoiceNo ?? "");
  const [recognized, setRecognized] = useState<RecognizedInvoice | null>(null);
  const [ocrPending, setOcrPending] = useState(false);
  const [isPending, startTransition] = useTransition();
  const invoiceRef = useRef<HTMLInputElement>(null);

  async function handleInvoicePick(file: File | null) {
    setInvoiceFile(file);
    setRecognized(null);
    if (!file) {
      setInvoiceNo(request.invoiceNo ?? "");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.warning("Tệp hóa đơn vượt 6MB — đã chọn tệp, vui lòng nhập tay số hóa đơn");
      return;
    }
    setOcrPending(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await recognizeInvoiceFromImage(fd);
      if (!res.ok) {
        toast.warning("Nhận diện hóa đơn chưa hoàn tất", { description: res.message });
        return;
      }
      setRecognized(res.data);
      if (res.data.invoiceNumber) setInvoiceNo(res.data.invoiceNumber);
      toast.success(res.data.invoiceNumber ? "Đã nhận diện & điền số hóa đơn" : "Đã nhận diện thông tin hóa đơn");
    } catch (err) {
      toast.warning("Nhận diện hóa đơn thất bại", {
        description: err instanceof Error ? err.message : ""
      });
    } finally {
      setOcrPending(false);
    }
  }

  function handleSubmit() {
    if (request.status === "APPROVED" && !invoiceFile && !request.invoiceFile) {
      toast.warning("Vui lòng tải lên hóa đơn điện tử");
      return;
    }
    if (invoiceFile && !invoiceNo.trim()) {
      toast.warning("Vui lòng nhập số hóa đơn khi tải hóa đơn điện tử");
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("requestId", request.id);
        if (note.trim()) fd.set("processNote", note.trim());
        if (invoiceFile) fd.set("invoiceFile", invoiceFile);
        if (invoiceNo.trim()) fd.set("invoiceNo", invoiceNo.trim());
        const res = await approveInvoiceRequest(fd);
        toast.success(
          res.status === "ISSUED" ? "Đã xuất hóa đơn điện tử" : "Đã duyệt, chờ bù hóa đơn điện tử"
        );
        onOpenChange(false);
      } catch (err) {
        toast.error("Xử lý thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Xử lý yêu cầu xuất hóa đơn
          </DialogTitle>
          <DialogDescription className="text-xs">
            {request.matter?.internalCode ?? "Không liên kết vụ án"} · {formatCurrency(Number(request.amount))}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <RequestSummary request={request} />
          <EvidencePanel request={request} />

          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Hóa đơn điện tử</div>
                <p className="text-[11px] text-muted-foreground">
                  Chọn tệp để tự nhận diện số hóa đơn, số tiền, bên mua/bán; nếu nhận diện lỗi có thể nhập tay.
                </p>
              </div>
            </div>
            <FileSlot
              label="Tải lên hóa đơn điện tử"
              file={invoiceFile}
              existing={request.invoiceFile}
              inputRef={invoiceRef}
              accept="image/*,application/pdf"
              onPick={handleInvoicePick}
            />
            {ocrPending && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang nhận diện hóa đơn...
              </div>
            )}
            {recognized && <OcrPreview data={recognized} requestedAmount={Number(request.amount)} />}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Số hóa đơn {invoiceFile && <span className="text-destructive">*</span>}
            </Label>
            <Input
              className="font-mono tabular"
              placeholder="vd 24432000000123456789 (bắt buộc khi tải hóa đơn điện tử)"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ghi chú (tuỳ chọn)</Label>
            <Textarea
              rows={2}
              placeholder="vd: số hóa đơn, mã số thuế..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="gap-1.5">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {invoiceFile ? "Xác nhận xuất" : "Duyệt, chờ xuất HĐ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequestSummary({ request }: { request: InvoiceRequestRow }) {
  return (
    <section className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
      <div className="text-sm font-medium">Thông tin yêu cầu</div>
      <div className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
        <FieldLine label="Người yêu cầu" value={request.requestedBy.name} />
        <FieldLine
          label="Thời gian yêu cầu"
          value={new Date(request.requestedAt).toLocaleString("vi-VN")}
        />
        <FieldLine label="Số tiền" value={formatCurrency(Number(request.amount))} />
        <FieldLine
          label="Loại hóa đơn"
          value={request.invoiceType ? INVOICE_TYPE_LABEL[request.invoiceType] : "Chưa điền"}
        />
        <FieldLine
          label="Khoản mục"
          value={request.invoiceItem ? INVOICE_ITEM_LABEL[request.invoiceItem] : "Chưa điền"}
        />
        <FieldLine label="Đơn vị mua" value={request.buyerName ?? "Chưa điền"} />
        <FieldLine label="Mã số thuế" value={request.buyerTaxNo ?? "Chưa điền"} mono />
        <FieldLine
          label="Vụ án liên quan"
          value={
            request.matter
              ? `${request.matter.internalCode} ${request.matter.title}`
              : `Không liên kết vụ án${request.noMatterReason ? `: ${request.noMatterReason}` : ""}`
          }
        />
        {request.invoiceType === "SPECIAL" && (
          <>
            <FieldLine label="Địa chỉ bên mua" value={request.buyerAddress ?? "Chưa điền"} />
            <FieldLine label="Điện thoại bên mua" value={request.buyerPhone ?? "Chưa điền"} mono />
            <FieldLine label="Ngân hàng mở TK" value={request.buyerBank ?? "Chưa điền"} />
            <FieldLine label="Số tài khoản" value={request.buyerBankAccount ?? "Chưa điền"} mono />
          </>
        )}
      </div>
      {request.requestNote && (
        <div className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
          Ghi chú yêu cầu: {request.requestNote}
        </div>
      )}
    </section>
  );
}

function EvidencePanel({ request }: { request: InvoiceRequestRow }) {
  return (
    <section className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">Đính kèm yêu cầu</div>
        <span className="text-[11px] text-muted-foreground">
          {request.evidenceDocs.length} tệp căn cứ
        </span>
      </div>
      {request.evidenceDocs.length === 0 && !request.contractScan ? (
        <p className="rounded-md border border-dashed border-border bg-background py-3 text-center text-xs text-muted-foreground">
          Chưa tải lên căn cứ xuất hóa đơn kèm theo yêu cầu
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {request.evidenceDocs.map((doc) => (
            <DocLink key={doc.id} id={doc.id} name={doc.name} label="Căn cứ" />
          ))}
          {request.contractScan && (
            <DocLink id={request.contractScan.id} name={request.contractScan.name} label="Hợp đồng cũ" />
          )}
        </div>
      )}
    </section>
  );
}

function OcrPreview({
  data,
  requestedAmount
}: {
  data: RecognizedInvoice;
  requestedAmount: number;
}) {
  const recognizedAmount = data.totalWithTax ?? data.totalAmount;
  const mismatch =
    typeof recognizedAmount === "number" &&
    Math.abs(recognizedAmount - requestedAmount) >= 0.01;

  return (
    <div className="rounded-md border border-border bg-background px-3 py-2 text-xs">
      <div className="mb-1 font-medium text-foreground">Kết quả nhận diện</div>
      <div className="grid gap-x-4 gap-y-1 text-muted-foreground sm:grid-cols-2">
        {data.invoiceType && <span>Loại: {data.invoiceType}</span>}
        {data.invoiceNumber && (
          <span>
            Số hóa đơn: <span className="font-mono text-foreground/80">{data.invoiceNumber}</span>
          </span>
        )}
        {data.invoiceDate && <span>Ngày hóa đơn: {data.invoiceDate}</span>}
        {typeof recognizedAmount === "number" && (
          <span>
            Số tiền nhận diện: <span className="font-mono text-foreground/80">{formatCurrency(recognizedAmount)}</span>
          </span>
        )}
        {typeof data.taxAmount === "number" && (
          <span>
            Thuế: <span className="font-mono text-foreground/80">{formatCurrency(data.taxAmount)}</span>
          </span>
        )}
        {data.buyerName && <span>Bên mua: {data.buyerName}</span>}
        {data.sellerName && <span>Bên bán: {data.sellerName}</span>}
      </div>
      {mismatch && (
        <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300">
          Số tiền nhận diện khác số tiền yêu cầu — vui lòng kiểm tra lại trước khi xuất.
        </div>
      )}
    </div>
  );
}

function FieldLine({
  label,
  value,
  mono
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("truncate text-foreground/85", mono && "font-mono tabular")}>{value}</div>
    </div>
  );
}

function DocLink({ id, name, label }: { id: string; name: string; label: string }) {
  return (
    <a
      href={`/api/documents/${id}/download`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
    >
      <Download className="h-3.5 w-3.5 shrink-0" />
      <span className="shrink-0 text-[11px]">{label}</span>
      <span className="truncate">{name}</span>
    </a>
  );
}

function FileSlot({
  label,
  file,
  existing,
  inputRef,
  accept,
  onPick
}: {
  label: string;
  file: File | null;
  existing: { id: string; name: string } | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  accept?: string;
  onPick: (f: File | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="h-9 gap-1"
        >
          <Upload className="h-3.5 w-3.5" />
          {file ? "Chọn lại" : "Chọn tệp"}
        </Button>
        {file && (
          <>
            <span className="flex-1 truncate text-xs">{file.name}</span>
            <button
              type="button"
              onClick={() => onPick(null)}
              className="text-destructive/70 hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {!file && existing && (
          <a
            href={`/api/documents/${existing.id}/download`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 truncate text-[11px] text-muted-foreground hover:text-foreground"
          >
            Đã lưu: {existing.name} (tải lại sẽ ghi đè)
          </a>
        )}
      </div>
    </div>
  );
}

function RejectDialog({
  request,
  open,
  onOpenChange
}: {
  request: InvoiceRequestRow;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!reason.trim()) {
      toast.warning("Vui lòng nhập lý do từ chối");
      return;
    }
    startTransition(async () => {
      try {
        await rejectInvoiceRequest({ requestId: request.id, reason });
        toast.success("Đã từ chối");
        onOpenChange(false);
      } catch (err) {
        toast.error("Thao tác thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Từ chối yêu cầu xuất hóa đơn</DialogTitle>
          <DialogDescription className="text-xs">
            {request.matter?.internalCode ?? "Không liên kết vụ án"} · {formatCurrency(Number(request.amount))}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-xs">Lý do từ chối *</Label>
          <Textarea
            rows={3}
            placeholder="vd: số tiền khác hợp đồng / thiếu thông tin đơn vị mua"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Huỷ
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isPending || !reason.trim()}
          >
            {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Xác nhận từ chối
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
