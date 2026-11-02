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

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Paperclip, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { RadioChips } from "@/components/ui/radio-chips";
import {
  billingCreateSchema,
  feeEntryCreateSchema,
  type BillingCreateInput,
  type FeeEntryCreateInput
} from "@/server/finance/schemas";
import { listMatterInvoiceRequests } from "@/server/finance/actions";
import {
  createBilling,
  createFeeEntry,
  setCommissionPlan
} from "@/server/finance/billing-actions";
import { uploadDocument } from "@/server/documents/actions";
import { recognizeInvoiceFromImage, type RecognizedInvoice } from "@/server/ai/actions";
import { userRoleLabel } from "@/lib/enums";

// ============ AddBillingSheet ============

export function AddBillingSheet({
  open,
  onOpenChange,
  matterId
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [contractFile, setContractFile] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors }
  } = useForm<BillingCreateInput>({
    resolver: zodResolver(billingCreateSchema),
    defaultValues: {
      matterId,
      title: "",
      contractAmount: 0,
      schedule: "",
      status: "ACTIVE"
    }
  });

  const watchedStatus = useWatch({ name: "status", control });

  function onSubmit(values: BillingCreateInput) {
    startTransition(async () => {
      try {
        await createBilling(values);
        if (contractFile) {
          const fd = new FormData();
          fd.set("matterId", matterId);
          fd.set("name", contractFile.name);
          fd.set("category", "CONTRACT");
          fd.set("encrypted", "true");
          fd.set("tags", `Hợp đồng,${values.title}`);
          fd.set("file", contractFile);
          await uploadDocument(fd);
          toast.success("Hợp đồng đã tạo, tệp đính kèm đã mã hoá lưu vào kho");
        } else {
          toast.success("Hợp đồng đã tạo");
        }
        reset();
        setContractFile(null);
        onOpenChange(false);
      } catch (err) {
        toast.error("Thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[92vw] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Thêm hợp đồng</DialogTitle>
          <DialogDescription className="text-xs">
            Một vụ án có thể có nhiều hợp đồng (vd ủy quyền theo giai đoạn). Có thể tải kèm bản scan hợp đồng, sau khi mã hoá lưu vào kho thì thuộc kho tài liệu của vụ.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            <Field label="Tên hợp đồng" required error={errors.title?.message}>
              <Input
                placeholder="vd: Hợp đồng ủy quyền - giai đoạn sơ thẩm"
                {...register("title")}
              />
            </Field>

            <Field label="Giá trị hợp đồng (VNĐ)" required>
              <Input
                type="number"
                step="0.01"
                className="font-mono tabular"
                {...register("contractAmount", { valueAsNumber: true })}
              />
            </Field>

            <Field label="Trạng thái">
              <RadioChips
                size="sm"
                items={[
                  { value: "DRAFT", label: "Nháp" },
                  { value: "ACTIVE", label: "Đang hiệu lực" },
                  { value: "CLOSED", label: "Đã thanh toán xong" }
                ]}
                value={watchedStatus}
                onChange={(v) => setValue("status", v as BillingCreateInput["status"])}
              />
            </Field>

            <Field label="Ngày ký">
              <Input type="date" {...register("signedAt", { valueAsDate: true })} />
            </Field>

            <Field label="Thoả thuận thanh toán theo giai đoạn">
              <Textarea
                rows={3}
                placeholder="vd: thu 30% khi ký, thu 30% khi tiếp nhận, thu 40% sau khi bản án có hiệu lực"
                {...register("schedule")}
              />
            </Field>

            <Field label="Tệp đính kèm hợp đồng (tuỳ chọn)">
              <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed border-border px-3 py-3 text-[12px] text-muted-foreground hover:bg-muted/30">
                <Paperclip className="h-3.5 w-3.5" />
                {contractFile ? (
                  <span className="flex items-center gap-1 text-foreground">
                    <FileText className="h-3 w-3" />
                    {contractFile.name}
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      ({(contractFile.size / 1024).toFixed(0)} KB)
                    </span>
                  </span>
                ) : (
                  "Chọn tệp PDF / docx, khi gửi sẽ tự mã hoá lưu vào kho"
                )}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => setContractFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </Field>
          </div>

          <DialogFooter className="border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={isPending} className="gap-1.5">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Tạo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============ AddFeeEntrySheet ============

export function AddFeeEntrySheet({
  open,
  onOpenChange,
  matterId,
  billings
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
  billings: { id: string; title: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [invoiceRequests, setInvoiceRequests] = useState<
    Awaited<ReturnType<typeof listMatterInvoiceRequests>>
  >([]);

  useEffect(() => {
    if (!open) return;
    listMatterInvoiceRequests(matterId)
      .then(setInvoiceRequests)
      .catch(() => setInvoiceRequests([]));
  }, [open, matterId]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors }
  } = useForm<FeeEntryCreateInput>({
    resolver: zodResolver(feeEntryCreateSchema),
    defaultValues: {
      matterId,
      billingId: "",
      type: "RECEIVED",
      amount: 0,
      occurredAt: new Date(),
      invoiceNo: "",
      payerOrPayee: "",
      method: "",
      note: ""
    }
  });

  const watchedType = useWatch({ name: "type", control });
  const watchedBillingId = useWatch({ name: "billingId", control });
  const watchedNote = useWatch({ name: "note", control });
  const type = watchedType; // alias for existing code

  function onSubmit(values: FeeEntryCreateInput) {
    startTransition(async () => {
      try {
        await createFeeEntry(values);
        toast.success(
          values.type === "RECEIVED" ? "Đã ghi nhận khoản thu, phân chia đã tính tự động" : "Bản ghi đã tạo"
        );
        reset();
        onOpenChange(false);
      } catch (err) {
        toast.error("Thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[92vw] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Thêm bản ghi thu/chi</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            <Field label="Loại" required>
              <RadioChips
                size="sm"
                items={[
                  { value: "RECEIVABLE", label: "Phải thu" },
                  { value: "RECEIVED", label: "Đã thu", accent: "#16a34a" },
                  { value: "REFUND", label: "Hoàn tiền", accent: "#dc2626" },
                  { value: "COST", label: "Chi phí" }
                ]}
                value={type}
                onChange={(v) => setValue("type", v as FeeEntryCreateInput["type"])}
              />
            </Field>

            <Field label="Số tiền (VNĐ)" required error={errors.amount?.message}>
              <Input
                type="number"
                step="0.01"
                className="font-mono tabular"
                {...register("amount", { valueAsNumber: true })}
              />
            </Field>

            <Field label="Ngày phát sinh" required>
              <Input
                type="date"
                {...register("occurredAt", { valueAsDate: true })}
              />
            </Field>

            {billings.length > 0 && (
              <Field label="Hợp đồng liên kết">
                <Select
                  value={watchedBillingId || "none"}
                  onValueChange={(v) =>
                    setValue("billingId", v === "none" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không liên kết</SelectItem>
                    {billings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field label="Bên trả / Bên nhận">
              <Input placeholder="vd Công ty TNHH Xây dựng Thanh Thạch" {...register("payerOrPayee")} />
            </Field>

            <Field label="Phương thức">
              <Input placeholder="Chuyển khoản / Tiền mặt / Ví điện tử" {...register("method")} />
            </Field>

            {invoiceRequests.length > 0 && (
              <Field
                label="Hóa đơn yêu cầu liên kết"
                hint="Chọn sẽ tự điền số tiền; đã xuất thì điền số hóa đơn thật, chưa xuất thì điền dấu giữ chỗ req:xxxxxxxx"
              >
                <Select
                  value="none"
                  onValueChange={(v) => {
                    if (v === "none") return;
                    const req = invoiceRequests.find((r) => r.id === v);
                    if (!req) return;
                    setValue("amount", Number(req.amount), { shouldDirty: true });
                    // Ưu tiên dùng số hóa đơn thật (khi tài chính đã ISSUED thì điền lại), nếu không thì dùng dấu giữ chỗ
                    const invoiceNoValue = req.invoiceNo ?? `req:${req.id.slice(0, 8)}`;
                    setValue("invoiceNo", invoiceNoValue, { shouldDirty: true });
                    const existing = watchedNote ?? "";
                    const noteText = req.invoiceNo
                      ? `HĐ yêu cầu liên kết #${req.id.slice(0, 8)}${req.title ? " (" + req.title + ")" : ""}`
                      : `HĐ yêu cầu liên kết (chưa xuất) #${req.id.slice(0, 8)}${req.title ? " (" + req.title + ")" : ""}`;
                    setValue("note", existing ? `${existing}\n${noteText}` : noteText, {
                      shouldDirty: true
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn từ hóa đơn đã yêu cầu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không liên kết</SelectItem>
                    {invoiceRequests.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        ¥{Number(r.amount).toLocaleString()} ·{" "}
                        {r.title ?? "Chưa đặt tên"} ·{" "}
                        {r.invoiceNo ? `Đã xuất ${r.invoiceNo}` : r.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field label="Số hóa đơn">
              <Input className="font-mono" {...register("invoiceNo")} />
            </Field>

            <InvoiceOcrBlock
              onRecognized={(data) => {
                if (data.invoiceNumber)
                  setValue("invoiceNo", data.invoiceNumber, { shouldDirty: true });
                if (data.totalWithTax || data.totalAmount) {
                  setValue("amount", Number(data.totalWithTax ?? data.totalAmount), {
                    shouldDirty: true
                  });
                }
                if (data.sellerName)
                  setValue("payerOrPayee", data.sellerName, { shouldDirty: true });
                if (data.invoiceDate) {
                  const d = new Date(data.invoiceDate);
                  if (!isNaN(d.getTime()))
                    setValue("occurredAt", d, { shouldDirty: true });
                }
              }}
            />

            <Field label="Ghi chú">
              <Textarea rows={2} {...register("note")} />
            </Field>
          </div>

          <DialogFooter className="border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={isPending} className="gap-1.5">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {type === "RECEIVED" ? "Ghi nhận thu (tự phân chia)" : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============ EditCommissionPlanDialog ============

type PlanRow = { userId: string; percent: number; label: string };

export function EditCommissionPlanDialog({
  open,
  onOpenChange,
  matterId,
  userOptions,
  initialPlans
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
  userOptions: { id: string; name: string; role: string }[];
  initialPlans: PlanRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [plans, setPlans] = useState<PlanRow[]>(initialPlans);

  function addRow() {
    const available = userOptions.find((u) => !plans.some((p) => p.userId === u.id));
    if (available) {
      setPlans([...plans, { userId: available.id, percent: 0, label: "" }]);
    } else {
      toast.warning("Đã thêm phân chia cho mọi người dùng");
    }
  }

  function removeRow(idx: number) {
    setPlans(plans.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, patch: Partial<PlanRow>) {
    setPlans(plans.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  const total = plans.reduce((acc, p) => acc + p.percent, 0);

  function handleSave() {
    if (total > 100) {
      toast.error("Tổng phân chia không được vượt 100%");
      return;
    }
    startTransition(async () => {
      try {
        await setCommissionPlan({ matterId, items: plans });
        toast.success("Đã lưu phương án phân chia");
        onOpenChange(false);
      } catch (err) {
        toast.error("Lưu thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Phương án phân chia</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Tỷ lệ không liệt kê thì văn phòng giữ lại. Khi thu sẽ tự sinh mục phân chia theo phương án này.
          </p>
        </DialogHeader>

        <div className="space-y-2">
          {plans.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-background py-6 text-center text-xs text-muted-foreground">
              Chưa cấu hình phân chia
            </p>
          ) : (
            plans.map((p, idx) => {
              return (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 rounded-lg border border-border bg-background p-3"
                >
                  <div className="col-span-4">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Người dùng
                    </Label>
                    <Select
                      value={p.userId}
                      onValueChange={(v) => updateRow(idx, { userId: v })}
                    >
                      <SelectTrigger className="mt-1 h-9 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {userOptions.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} · {userRoleLabel[u.role as keyof typeof userRoleLabel] ?? u.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Tỷ lệ %
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      min={0}
                      max={100}
                      value={p.percent}
                      onChange={(e) =>
                        updateRow(idx, { percent: Number(e.target.value) || 0 })
                      }
                      className="mt-1 h-9 bg-background font-mono tabular"
                    />
                  </div>
                  <div className="col-span-4">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Nhãn
                    </Label>
                    <Input
                      value={p.label}
                      onChange={(e) => updateRow(idx, { label: e.target.value })}
                      placeholder="Luật sư chủ trì / Người giới thiệu / Cộng sự"
                      className="mt-1 h-9 bg-background"
                    />
                  </div>
                  <div className="col-span-1 flex items-end justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(idx)}
                      className="h-9 w-9 p-0 text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
          <Button variant="outline" size="sm" onClick={addRow} className="h-7 gap-1">
            <Plus className="h-3.5 w-3.5" />
            Thêm
          </Button>
          <div className="flex items-center gap-4 text-xs">
            <div>
              Tổng người hưởng:
              <span className="ml-1 font-mono tabular text-foreground">{total.toFixed(1)}%</span>
            </div>
            <div>
              Văn phòng giữ:
              <span className="ml-1 font-mono tabular text-muted-foreground">
                {Math.max(0, 100 - total).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Huỷ
          </Button>
          <Button onClick={handleSave} disabled={isPending} className="gap-1.5">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Lưu phương án
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Invoice OCR ============

function InvoiceOcrBlock({
  onRecognized
}: {
  onRecognized: (data: RecognizedInvoice) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<RecognizedInvoice | null>(null);

  const recognize = async () => {
    if (!file) {
      toast.warning("Hãy chọn ảnh hóa đơn trước");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await recognizeInvoiceFromImage(fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setPreview(res.data);
      onRecognized(res.data);
      toast.success("Đã nhận diện và tự động điền");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nhận diện thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5 rounded-md border border-dashed border-border bg-muted/20 p-3">
      <Label className="flex items-center gap-1.5 text-xs">
        <Sparkles className="h-3 w-3 text-primary" />
        Nhận diện hóa đơn bằng AI (tuỳ chọn)
      </Label>
      <p className="text-[11px] text-muted-foreground">
        Tải lên hóa đơn GTGT (JPG / PNG / PDF), sau khi nhận diện sẽ tự điền số HĐ / số tiền / bên bán / ngày lập
      </p>
      <div className="flex items-center gap-2">
        <label className="flex flex-1 cursor-pointer items-center gap-2 rounded border border-border bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/30">
          <Paperclip className="h-3 w-3" />
          {file ? (
            <span className="flex items-center gap-1 text-foreground">
              <FileText className="h-3 w-3" />
              {file.name}
            </span>
          ) : (
            "Chọn hóa đơn (JPG / PNG / PDF)"
          )}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
            }}
          />
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={recognize}
          disabled={!file || busy}
          className="h-8 gap-1 text-[11px]"
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
          Nhận diện
        </Button>
      </div>
      {preview && (
        <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 rounded border border-border bg-background p-2 text-[10.5px] text-muted-foreground">
          {preview.invoiceType && <div>Loại: {preview.invoiceType}</div>}
          {preview.invoiceNumber && (
            <div>
              Số HĐ: <span className="font-mono text-foreground/85">{preview.invoiceNumber}</span>
            </div>
          )}
          {preview.invoiceDate && <div>Ngày lập: {preview.invoiceDate}</div>}
          {preview.sellerName && <div>Bên bán: {preview.sellerName}</div>}
          {preview.buyerName && <div>Bên mua: {preview.buyerName}</div>}
          {preview.totalWithTax != null && (
            <div>
              Tổng cộng tiền thuế:
              <span className="font-mono text-foreground/85">¥{preview.totalWithTax}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ Shared Field ============

function Field({
  label,
  required,
  error,
  hint,
  children
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-xs">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
