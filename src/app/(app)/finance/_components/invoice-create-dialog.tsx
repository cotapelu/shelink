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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Paperclip, FileText, X, Receipt, Search, Building2 } from "lucide-react";
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
  getMatterInvoiceContext,
  searchMattersForInvoice
} from "@/server/finance/actions";
import { uploadDocument } from "@/server/documents/actions";
import { cn } from "@/lib/utils";

type InvoiceType = "PLAIN" | "SPECIAL";
type InvoiceItem = "LAWYER_FEE" | "CONSULTING_FEE" | "AGENCY_FEE" | "OTHER";
type MatterRef = { id: string; internalCode: string; title: string };
type ClientOption = { id: string; name: string; taxNo: string | null; isPrimary: boolean };

const INVOICE_ITEM_OPTIONS: { value: InvoiceItem; label: string }[] = [
  { value: "LAWYER_FEE", label: "Phí luật sư" },
  { value: "CONSULTING_FEE", label: "Phí tư vấn" },
  { value: "AGENCY_FEE", label: "Phí đại diện" },
  { value: "OTHER", label: "Dịch vụ pháp lý khác" }
];

export function InvoiceCreateDialog({
  open,
  onOpenChange,
  canCreateUnlinkedInvoice = false
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  canCreateUnlinkedInvoice?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Chế độ liên kết vụ án
  const [noMatter, setNoMatter] = useState(false);
  const [noMatterReason, setNoMatterReason] = useState("");
  const [matterQuery, setMatterQuery] = useState("");
  const [matterResults, setMatterResults] = useState<MatterRef[]>([]);
  const [selectedMatter, setSelectedMatter] = useState<MatterRef | null>(null);
  const [matterLoading, setMatterLoading] = useState(false);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);

  // Trường hóa đơn
  const [amount, setAmount] = useState("");
  const [invoiceType, setInvoiceType] = useState<InvoiceType | null>(null);
  const [invoiceItem, setInvoiceItem] = useState<InvoiceItem>("LAWYER_FEE");
  const [buyerName, setBuyerName] = useState("");
  const [buyerTaxNo, setBuyerTaxNo] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerBank, setBuyerBank] = useState("");
  const [buyerBankAccount, setBuyerBankAccount] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const matterSearchSeqRef = useRef(0);

  function reset() {
    matterSearchSeqRef.current += 1;
    setNoMatter(false);
    setNoMatterReason("");
    setMatterQuery("");
    setMatterResults([]);
    setSelectedMatter(null);
    setMatterLoading(false);
    setClientOptions([]);
    setAmount("");
    setInvoiceType(null);
    setInvoiceItem("LAWYER_FEE");
    setBuyerName("");
    setBuyerTaxNo("");
    setBuyerAddress("");
    setBuyerPhone("");
    setBuyerBank("");
    setBuyerBankAccount("");
    setRequestNote("");
    setEvidenceFiles([]);
  }

  useEffect(() => {
    if (open) {
      reset();
      loadMatterOptions("");
    }
  }, [open]);

  function loadMatterOptions(q: string) {
    const query = q.trim();
    const seq = matterSearchSeqRef.current + 1;
    matterSearchSeqRef.current = seq;
    setMatterLoading(true);

    searchMattersForInvoice(query)
      .then((items) => {
        if (matterSearchSeqRef.current === seq) setMatterResults(items);
      })
      .catch(() => {
        if (matterSearchSeqRef.current === seq) setMatterResults([]);
      })
      .finally(() => {
        if (matterSearchSeqRef.current === seq) setMatterLoading(false);
      });
  }

  function runSearch(q: string) {
    setMatterQuery(q);
    loadMatterOptions(q);
  }

  function pickMatter(m: MatterRef) {
    setSelectedMatter(m);
    setClientOptions([]);
    setBuyerName("");
    setBuyerTaxNo("");
    getMatterInvoiceContext(m.id)
      .then((ctx) => {
        setClientOptions(ctx.clientOptions);
        if (ctx.clientOptions.length === 1) {
          const only = ctx.clientOptions[0];
          setBuyerName(only.name);
          setBuyerTaxNo(only.taxNo ?? "");
        }
      })
      .catch(() => setClientOptions([]));
  }

  function pickClient(id: string) {
    const c = clientOptions.find((o) => o.id === id);
    if (c) {
      setBuyerName(c.name);
      if (c.taxNo) setBuyerTaxNo(c.taxNo);
    }
  }

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).filter((f) => f.size <= 20 * 1024 * 1024);
    if (arr.length < list.length) toast.warning("Đã bỏ qua tệp vượt 20MB");
    setEvidenceFiles((prev) => [...prev, ...arr]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.warning("Vui lòng nhập số tiền");
    if (!noMatter && !selectedMatter) return toast.warning("Vui lòng chọn vụ án liên quan hoặc tick 「Không liên kết vụ án」");
    if (noMatter && !noMatterReason.trim()) return toast.warning("Vui lòng nêu lý do khi không liên kết vụ án");
    if (!invoiceType) return toast.warning("Vui lòng chọn loại hóa đơn");
    if (!buyerName.trim()) return toast.warning("Vui lòng nhập đơn vị mua");
    if (invoiceType === "SPECIAL") {
      if (!buyerTaxNo.trim()) return toast.warning("Hóa đơn GTGT bắt buộc nhập mã số thuế");
      if (!buyerAddress.trim()) return toast.warning("Hóa đơn GTGT bắt buộc nhập địa chỉ bên mua");
      if (!buyerPhone.trim()) return toast.warning("Hóa đơn GTGT bắt buộc nhập điện thoại bên mua");
      if (!buyerBank.trim()) return toast.warning("Hóa đơn GTGT bắt buộc nhập ngân hàng mở tài khoản");
      if (!buyerBankAccount.trim()) return toast.warning("Hóa đơn GTGT bắt buộc nhập số tài khoản");
    }
    if (!noMatter && evidenceFiles.length === 0) {
      return toast.warning("Vui lòng tải căn cứ xuất hóa đơn (bản scan hợp đồng...)");
    }

    startTransition(async () => {
      try {
        const isSpecial = invoiceType === "SPECIAL";
        const docIds: string[] = [];
        // Chỉ tải căn cứ khi có vụ án (căn cứ phải gắn vụ)
        if (!noMatter && selectedMatter) {
          for (const file of evidenceFiles) {
            const fd = new FormData();
            fd.set("matterId", selectedMatter.id);
            fd.set("name", file.name);
            fd.set("category", "OTHER");
            fd.set("encrypted", "true");
            fd.set("tags", "Căn cứ xuất hóa đơn");
            fd.set("file", file);
            const doc = await uploadDocument(fd);
            docIds.push(doc.id);
          }
        }
        await createInvoiceRequest({
          matterId: noMatter ? null : selectedMatter!.id,
          noMatterReason: noMatter ? noMatterReason : null,
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
        router.refresh();
      } catch (err) {
        toast.error("Gửi thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[92vw] max-w-xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-3">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Yêu cầu xuất hóa đơn
          </DialogTitle>
          <DialogDescription className="text-xs">
            {canCreateUnlinkedInvoice
              ? "Chọn vụ án bạn được liên kết, hoặc xuất cho hóa đơn không liên kết vụ án (phải nêu lý do)"
              : "Chọn vụ án bạn được liên kết rồi gửi yêu cầu xuất hóa đơn"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Vụ án liên quan */}
          <Field label="Vụ án liên quan" required>
            <div className="space-y-2">
              {canCreateUnlinkedInvoice && (
                <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={noMatter}
                    onChange={(e) => {
                      setNoMatter(e.target.checked);
                      if (e.target.checked) {
                        setSelectedMatter(null);
                      } else {
                        loadMatterOptions(matterQuery);
                      }
                    }}
                  />
                  Không liên kết vụ án (doanh thu phi vụ án: tư vấn, dịch vụ...)
                </label>
              )}

              {canCreateUnlinkedInvoice && noMatter ? (
                <Textarea
                  rows={2}
                  placeholder="Nêu lý do cụ thể không liên kết vụ án (bắt buộc)"
                  value={noMatterReason}
                  onChange={(e) => setNoMatterReason(e.target.value)}
                />
              ) : selectedMatter ? (
                <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    <span className="font-mono text-muted-foreground">{selectedMatter.internalCode}</span>
                    <span className="truncate">{selectedMatter.title}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedMatter(null)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={matterQuery}
                      onChange={(e) => runSearch(e.target.value)}
                      placeholder="Tìm tên vụ / mã hệ thống / mã nội bộ"
                      className="h-8 pl-7 text-xs"
                    />
                  </div>
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {matterLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      </div>
                    ) : matterResults.length === 0 ? (
                      <p className="rounded-md border border-dashed border-border bg-background py-4 text-center text-xs text-muted-foreground">
                        {matterQuery.trim() ? "Không có vụ nào khớp" : "Chưa có vụ nào liên kết được"}
                      </p>
                    ) : (
                      matterResults.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => pickMatter(m)}
                          className="flex w-full flex-col rounded-sm border border-border bg-background px-2 py-1.5 text-left text-xs hover:border-primary"
                        >
                          <span className="font-mono text-[10.5px] text-muted-foreground">{m.internalCode}</span>
                          <span className="truncate">{m.title}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </Field>

          {/* Số tiền + loại */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số tiền" required>
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
              <Select value={invoiceType ?? undefined} onValueChange={(v) => setInvoiceType(v as InvoiceType)}>
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

          <Field label="Khoản mục" required>
            <RadioChips items={INVOICE_ITEM_OPTIONS} value={invoiceItem} onChange={(v) => setInvoiceItem(v as InvoiceItem)} />
          </Field>

          {/* Đơn vị mua */}
          <Field label="Đơn vị mua (khách hàng)" required hint={clientOptions.length > 0 ? "Các lựa chọn là khách hàng liên kết của vụ đã chọn" : undefined}>
            {!noMatter && clientOptions.length > 0 ? (
              <Select onValueChange={pickClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn đơn vị mua" />
                </SelectTrigger>
                <SelectContent>
                  {clientOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.isPrimary ? " (khách chính)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="vd: Công ty ABC / Nguyễn Văn A"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
              />
            )}
          </Field>

          {/* 6 yếu tố hóa đơn GTGT */}
          {invoiceType === "SPECIAL" && (
            <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
              <Field label="Mã số thuế" required>
                <Input className="font-mono" value={buyerTaxNo} onChange={(e) => setBuyerTaxNo(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ngân hàng mở TK" required>
                  <Input value={buyerBank} onChange={(e) => setBuyerBank(e.target.value)} />
                </Field>
                <Field label="Số tài khoản" required>
                  <Input className="font-mono" value={buyerBankAccount} onChange={(e) => setBuyerBankAccount(e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Địa chỉ bên mua" required>
                  <Input value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} />
                </Field>
                <Field label="Điện thoại bên mua" required>
                  <Input className="font-mono" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {/* Căn cứ: bắt buộc khi có vụ án */}
          {!noMatter && (
            <Field
              label="Căn cứ xuất hóa đơn"
              required
              hint="Bản scan hợp đồng..., mỗi tệp ≤ 20MB"
              action={
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="h-7 gap-1.5 px-2 text-[11px]">
                  <Paperclip className="h-3.5 w-3.5" />
                  Thêm tệp
                </Button>
              }
            >
              <div className="space-y-2">
                <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                {evidenceFiles.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border bg-background py-3 text-center text-xs text-muted-foreground">Chưa chọn tệp nào</p>
                ) : (
                  <ul className="space-y-1.5">
                    {evidenceFiles.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        <span className="flex-1 truncate">{f.name}</span>
                        <button type="button" onClick={() => setEvidenceFiles((c) => c.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Field>
          )}

          <Field label="Ghi chú yêu cầu (tuỳ chọn)">
            <Textarea rows={2} value={requestNote} onChange={(e) => setRequestNote(e.target.value)} />
          </Field>
        </div>

        <DialogFooter className="border-t border-border px-5 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={isPending} className="gap-1.5">
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
