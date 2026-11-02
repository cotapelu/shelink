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

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Paperclip, FileText, X, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { RadioChips } from "@/components/ui/radio-chips";
import {
  createInvoiceRequest,
  getMatterInvoiceContext
} from "@/server/finance/actions";
import { uploadDocument } from "@/server/documents/actions";
import { cn } from "@/lib/utils";

type InvoiceType = "PLAIN" | "SPECIAL";
type InvoiceItem = "LAWYER_FEE" | "CONSULTING_FEE" | "AGENCY_FEE" | "OTHER";

const INVOICE_ITEM_OPTIONS: { value: InvoiceItem; label: string }[] = [
  { value: "LAWYER_FEE", label: "Phí luật sư" },
  { value: "CONSULTING_FEE", label: "Phí tư vấn pháp lý" },
  { value: "AGENCY_FEE", label: "Phí đại diện" },
  { value: "OTHER", label: "Dịch vụ pháp lý khác" }
];

export function InvoiceRequestSheet({
  open,
  onOpenChange,
  matterId
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [ctxLoading, setCtxLoading] = useState(true);
  const [ctx, setCtx] = useState<Awaited<
    ReturnType<typeof getMatterInvoiceContext>
  > | null>(null);

  // Trạng thái form
  const [amount, setAmount] = useState<string>("");
  // v0.42 mục 5: loại hóa đơn không có giá trị mặc định, phải chủ động chọn một lần
  const [invoiceType, setInvoiceType] = useState<InvoiceType | null>(null);
  const [invoiceItem, setInvoiceItem] = useState<InvoiceItem>("LAWYER_FEE");
  // v0.42 mục 3: đơn vị mua đổi sang dropdown (khách của vụ án)
  const [buyerClientId, setBuyerClientId] = useState<string>("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerTaxNo, setBuyerTaxNo] = useState("");
  // v0.42 mục 4: sáu yếu tố bên mua của hóa đơn GTGT
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerBank, setBuyerBank] = useState("");
  const [buyerBankAccount, setBuyerBankAccount] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Lấy ngữ cảnh vụ án + reset form
  useEffect(() => {
    if (!open) return;
    setCtxLoading(true);
    getMatterInvoiceContext(matterId)
      .then((data) => {
        setCtx(data);
        // Chỉ một khách thì chọn mặc định, nhiều khách bắt buộc chọn
        if (data.clientOptions.length === 1) {
          const only = data.clientOptions[0];
          setBuyerClientId(only.id);
          setBuyerName(only.name);
          setBuyerTaxNo(only.taxNo ?? "");
        }
      })
      .catch(() => setCtx(null));
    setCtxLoading(false);
    setAmount("");
    setInvoiceType(null);
    setInvoiceItem("LAWYER_FEE");
    setBuyerClientId("");
    setBuyerName("");
    setBuyerTaxNo("");
    setBuyerAddress("");
    setBuyerPhone("");
    setBuyerBank("");
    setBuyerBankAccount("");
    setRequestNote("");
    setEvidenceFiles([]);
  }, [open, matterId]);

  function handlePickClient(id: string) {
    setBuyerClientId(id);
    const c = ctx?.clientOptions.find((o) => o.id === id);
    if (c) {
      setBuyerName(c.name);
      // Khi chọn khách thì điền sẵn mã số thuế (GTGT dùng lại được, luật sư có thể sửa)
      if (c.taxNo) setBuyerTaxNo(c.taxNo);
    }
  }

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).filter((f) => f.size <= 20 * 1024 * 1024);
    if (arr.length < list.length) toast.warning("Đã bỏ qua các tệp vượt quá 20MB");
    setEvidenceFiles((prev) => [...prev, ...arr]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit() {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.warning("Hãy điền số tiền");
      return;
    }
    if (!invoiceType) {
      toast.warning("Hãy chọn loại hóa đơn");
      return;
    }
    if (!buyerName.trim()) {
      toast.warning("Hãy chọn đơn vị mua");
      return;
    }
    if (invoiceType === "SPECIAL") {
      if (!buyerTaxNo.trim()) {
        toast.warning("Hóa đơn GTGT bắt buộc điền mã số thuế");
        return;
      }
      if (!buyerAddress.trim()) {
        toast.warning("Hóa đơn GTGT bắt buộc điền địa chỉ bên mua");
        return;
      }
      if (!buyerPhone.trim()) {
        toast.warning("Hóa đơn GTGT bắt buộc điền điện thoại bên mua");
        return;
      }
      if (!buyerBank.trim()) {
        toast.warning("Hóa đơn GTGT bắt buộc điền ngân hàng mở TK");
        return;
      }
      if (!buyerBankAccount.trim()) {
        toast.warning("Hóa đơn GTGT bắt buộc điền số tài khoản ngân hàng");
        return;
      }
    }
    if (evidenceFiles.length === 0) {
      toast.warning("Hãy tải lên căn cứ xuất HĐ (bản scan hợp đồng ủy quyền...)");
      return;
    }

    startTransition(async () => {
      try {
        // 1. Tải lên căn cứ xuất HĐ, lấy docId
        const docIds: string[] = [];
        for (const file of evidenceFiles) {
          const fd = new FormData();
          fd.set("matterId", matterId);
          fd.set("name", file.name);
          fd.set("category", "OTHER");
          fd.set("encrypted", "true");
          fd.set("tags", "Căn cứ xuất HĐ");
          fd.set("file", file);
          const doc = await uploadDocument(fd);
          docIds.push(doc.id);
        }

        // 2. Tạo yêu cầu xuất hóa đơn
        const isSpecial = invoiceType === "SPECIAL";
        await createInvoiceRequest({
          matterId,
          amount: amt,
          invoiceType,
          invoiceItem,
          buyerName,
          buyerTaxNo: isSpecial ? buyerTaxNo : null,
          buyerAddress: isSpecial ? buyerAddress : null,
          buyerPhone: isSpecial ? buyerPhone : null,
          buyerBank: isSpecial ? buyerBank : null,
          buyerBankAccount: isSpecial ? buyerBankAccount : null,
          evidenceDocIds: docIds,
          requestNote
        });

        toast.success("Đã gửi yêu cầu xuất hóa đơn");
        onOpenChange(false);
      } catch (err) {
        toast.error("Gửi thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  const clientOptions = ctx?.clientOptions ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[92vw] max-w-xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-3">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Yêu cầu xuất hóa đơn
          </DialogTitle>
          <DialogDescription className="text-xs">
            {ctxLoading
              ? "Đang tải thông tin vụ án..."
              : ctx
                ? `Vụ án: ${ctx.matterTitle}${ctx.intake ? " (đã liên kết duyệt tiếp nhận)" : ""}`
                : "Không tải được thông tin vụ án"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* v0.42 mục 5: số tiền + loại hóa đơn cùng một hàng */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số tiền yêu cầu xuất (VNĐ)" required>
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                className="font-mono"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Loại hóa đơn" required>
              <Select
                value={invoiceType ?? undefined}
                onValueChange={(v) => setInvoiceType(v as InvoiceType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLAIN">Hóa đơn thường</SelectItem>
                  <SelectItem value="SPECIAL">Hóa đơn GTGT</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Khoản mục */}
          <Field label="Khoản mục" required>
            <RadioChips
              items={INVOICE_ITEM_OPTIONS}
              value={invoiceItem}
              onChange={(v) => setInvoiceItem(v as InvoiceItem)}
            />
          </Field>

          {/* v0.42 mục 3: dropdown khách hàng bên mua (khách của vụ án) */}
          <Field
            label="Đơn vị mua (khách hàng)"
            required
            hint={
              clientOptions.length === 0
                ? "Vụ án chưa có khách hàng liên kết, hãy đăng ký khách ở mục các bên của vụ án"
                : "Các tuỳ chọn là khách hàng liên kết của vụ án"
            }
          >
            {clientOptions.length > 0 ? (
              <Select value={buyerClientId} onValueChange={handlePickClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn đơn vị mua" />
                </SelectTrigger>
                <SelectContent>
                  {clientOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.isPrimary ? " (khách hàng chính)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="vd: Công ty TNHH Moux-Shanghai / Nguyễn Văn A"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
              />
            )}
          </Field>

          {/* Sáu yếu tố bên mua của HĐ GTGT (v0.42 mục 4, tuân thủ luật thuế) */}
          {invoiceType === "SPECIAL" && (
            <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
              <Field label="Mã số thuế (mã số doanh nghiệp)" required>
                <Input
                  className="font-mono"
                  placeholder="91310000XXXXXXXXXX"
                  value={buyerTaxNo}
                  onChange={(e) => setBuyerTaxNo(e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ngân hàng mở TK" required>
                  <Input
                    placeholder="vd: Ngân hàng NN&PT Việt Nam - chi nhánh TP.HCM"
                    value={buyerBank}
                    onChange={(e) => setBuyerBank(e.target.value)}
                  />
                </Field>
                <Field label="Số tài khoản ngân hàng" required>
                  <Input
                    className="font-mono"
                    placeholder="62XXXXXXXXXXXXXXXX"
                    value={buyerBankAccount}
                    onChange={(e) => setBuyerBankAccount(e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Địa chỉ bên mua" required>
                  <Input
                    placeholder="Địa chỉ đăng ký trên giấy phép kinh doanh"
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                  />
                </Field>
                <Field label="Điện thoại bên mua" required>
                  <Input
                    className="font-mono"
                    placeholder="021-XXXXXXXX"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Căn cứ xuất HĐ */}
          <Field
            label="Căn cứ xuất HĐ"
            required
            hint="Bình thường bắt buộc tải bản scan hợp đồng ủy quyền, chứng từ thanh toán tuỳ chọn; trường hợp đặc biệt hãy gửi bản giải trình, mỗi tệp ≤ 20MB"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="h-7 gap-1.5 px-2 text-[11px]"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Thêm tệp
              </Button>
            }
          >
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              {evidenceFiles.length === 0 ? (
                <p className="rounded-md border border-dashed border-border bg-background py-3 text-center text-xs text-muted-foreground">
                  Chưa chọn tệp nào
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {evidenceFiles.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs"
                    >
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground tabular">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setEvidenceFiles((c) => c.filter((_, j) => j !== i))
                        }
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Xoá"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>

          {/* Ghi chú yêu cầu */}
          <Field label="Ghi chú yêu cầu (tuỳ chọn)">
            <Textarea
              rows={2}
              placeholder="vd: xin xuất sớm, khách đang thúc"
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter className="border-t border-border px-5 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Huỷ
          </Button>
          <Button onClick={submit} disabled={isPending || ctxLoading} className="gap-1.5">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Gửi yêu cầu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  hint,
  action,
  children
}: {
  label: string;
  required?: boolean;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className={cn("flex items-center gap-1 text-xs")}>
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        {action}
      </div>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
