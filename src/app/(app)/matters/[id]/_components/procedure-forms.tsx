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

import { useTransition, useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, ScanText } from "lucide-react";
import type { MatterCategory, ProcedureType } from "@prisma/client";
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
import {
  procedureCreateSchema,
  deadlineCreateSchema,
  hearingCreateSchema,
  type ProcedureCreateInput,
  type DeadlineCreateInput,
  type HearingCreateInput
} from "@/server/procedures/schemas";
import {
  addProcedure,
  addDeadline,
  addHearing
} from "@/server/procedures/actions";
import { parseSummons } from "@/server/ai/parse-summons";
import { procedureTypeLabel } from "@/lib/enums";
import { proceduresByCategory } from "@/lib/procedures-by-category";
import { agencyOptions } from "@/lib/china-regions";
import { JurisdictionSelect } from "@/app/(app)/intakes/_components/jurisdiction-select";
import { cn } from "@/lib/utils";

// Chinese number mapping for auto-title
const CN_NUM: Record<number, string> = { 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10" };

// ============ AddProcedureSheet ============

export function AddProcedureSheet({
  open,
  onOpenChange,
  matterId,
  category,
  nextOrder,
  colleagues,
  existingTypes
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
  category: MatterCategory;
  nextOrder: number;
  colleagues?: { id: string; name: string }[];
  /** Loại thủ tục đã tồn tại, tránh thêm trùng */
  existingTypes?: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const allOptions = proceduresByCategory[category];
  const existingSet = new Set(existingTypes ?? []);
  const procedureOptions = allOptions.filter(p => !existingSet.has(p));

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors }
  } = useForm<ProcedureCreateInput>({
    resolver: zodResolver(procedureCreateSchema),
    defaultValues: {
      matterId,
      type: procedureOptions[0],
      customLabel: "",
      engagement: "ENGAGED",
      caseNumber: "",
      handlingAgency: "",
      panel: "",
      handler: "",
      acceptedAt: undefined,
      jurisdiction: "",
      leadLawyerId: null,
      isExternalLead: false
    }
  });

  const jurisdiction = useWatch({ name: "jurisdiction", control }) ?? "";
  const procedureType = useWatch({ name: "type", control });
  const leadLawyerId = useWatch({ name: "leadLawyerId", control });
  const isExternalLead = useWatch({ name: "isExternalLead", control });
  const watchedHandlingAgency = useWatch({ name: "handlingAgency", control });
  const agencyOpts = useMemo(() => agencyOptions(jurisdiction), [jurisdiction]);

  function onSubmit(values: ProcedureCreateInput) {
    startTransition(async () => {
      try {
        await addProcedure(values);
        toast.success(`Đã thêm thủ tục (${procedureTypeLabel[values.type]})`);
        reset();
        onOpenChange(false);
      } catch (err) {
        toast.error("Thêm thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Thêm thủ tục (thứ {nextOrder})</DialogTitle>
          <DialogDescription className="text-xs">
            Nhập thông tin cơ bản và luật sư chủ trì
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {/* Loại thủ tục */}
            <div className="space-y-2">
              <Label className="text-xs">Loại thủ tục *</Label>
              <div className="flex flex-wrap gap-1.5">
                {procedureOptions.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setValue("type", p as ProcedureType)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs transition-colors",
                      procedureType === p
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-input"
                    )}
                  >
                    {procedureTypeLabel[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Luật sư chủ trì */}
            {colleagues && colleagues.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Luật sư chủ trì</Label>
                <div className="flex items-center gap-3">
                  <Select
                    value={isExternalLead ? "__external__" : (leadLawyerId ?? "__none__")}
                    onValueChange={(v) => {
                      if (v === "__external__") {
                        setValue("isExternalLead", true);
                        setValue("leadLawyerId", null);
                      } else if (v === "__none__") {
                        setValue("isExternalLead", false);
                        setValue("leadLawyerId", null);
                      } else {
                        setValue("isExternalLead", false);
                        setValue("leadLawyerId", v);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Chọn luật sư chủ trì" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Chưa chỉ định</SelectItem>
                      {colleagues.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                      <SelectItem value="__external__">Đại diện ngoài văn phòng</SelectItem>
                    </SelectContent>
                  </Select>
                  {isExternalLead && (
                    <span className="text-xs text-muted-foreground">Thủ tục này do luật sư ngoài đại diện</span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Số án">
                <Input
                  className="font-mono"
                  placeholder="vd: (2026) ... mã nội bộ ... số ..."
                  {...register("caseNumber")}
                />
              </Field>
              <Field label="Địa giới">
                <JurisdictionSelect
                  value={jurisdiction}
                  onChange={(v) => {
                    setValue("jurisdiction", v);
                    const cur = watchedHandlingAgency;
                    if (cur && !agencyOptions(v).includes(cur)) {
                      setValue("handlingAgency", "");
                    }
                  }}
                />
              </Field>
              <Field label="Cơ quan xử lý">
                <Select
                  value={watchedHandlingAgency || ""}
                  onValueChange={(v) => setValue("handlingAgency", v)}
                  disabled={agencyOpts.length === 0}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder={jurisdiction ? "Chọn cơ quan" : "Chọn địa giới trước"} />
                  </SelectTrigger>
                  <SelectContent>
                    {agencyOpts.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Chủ tọa / Trọng tài viên">
                <Input {...register("handler")} />
              </Field>
              <Field label="Phòng xét xử / Hội đồng xét xử">
                <Input {...register("panel")} />
              </Field>
              <Field
                label="Ngày tiếp nhận / thụ lý"
                error={errors.acceptedAt?.message as string | undefined}
              >
                <Input
                  type="date"
                  {...register("acceptedAt")}
                  onChange={(e) => {
                    const v = e.target.value;
                    setValue("acceptedAt", v ? new Date(v) : undefined, { shouldValidate: true });
                  }}
                />
              </Field>
            </div>
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
              Thêm thủ tục
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============ AddDeadlineSheet ============

const deadlineCategoryLabel: Record<
  DeadlineCreateInput["category"],
  string
> = {
  LIMITATION: "Thời hiệu khởi kiện",
  EVIDENCE: "Thời hạn chứng minh",
  APPEAL: "Thời hiệu kháng cáo",
  PERFORMANCE: "Thời hạn thực hiện",
  RESPONSE: "Thời hạn trả lời",
  ENFORCEMENT: "Yêu cầu thi hành",
  ARBITRATION_SET_ASIDE: "Thời hạn xin hủy án trọng tài",
  PRESERVATION: "Thời hạn bảo toàn",
  CUSTOM: "Khác"
};

export function AddDeadlineDialog({
  open,
  onOpenChange,
  procedures,
  defaultProcedureId
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** v0.45：nhắc gộp toàn vụ, thời hạn mới cần xác định thủ tục */
  procedures: { id: string; label: string }[];
  defaultProcedureId: string;
}) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors }
  } = useForm<DeadlineCreateInput>({
    resolver: zodResolver(deadlineCreateSchema),
    defaultValues: {
      procedureId: defaultProcedureId,
      title: "",
      category: "CUSTOM",
      dueAt: new Date(),
      basis: "",
      remindDays: 3
    }
  });

  const watchedProcedureId = useWatch({ name: "procedureId", control });
  const watchedCategory = useWatch({ name: "category", control });

  // Khi mở, đồng bộ giá trị mặc định thủ tục với thủ tục đang chọn
  useEffect(() => {
    if (open) setValue("procedureId", defaultProcedureId);
  }, [open, defaultProcedureId, setValue]);

  function onSubmit(values: DeadlineCreateInput) {
    startTransition(async () => {
      try {
        await addDeadline(values);
        toast.success("Đã thêm thời hạn");
        reset();
        onOpenChange(false);
      } catch (err) {
        toast.error("Thêm thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Thêm thời hạn</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            <Field label="Thủ tục" required>
              <Select
                value={watchedProcedureId || undefined}
                onValueChange={(v) => setValue("procedureId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn thủ tục" />
                </SelectTrigger>
                <SelectContent>
                  {procedures.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Tên thời hạn" required error={errors.title?.message}>
              <Input
                placeholder="vd: hạn chứng minh / ngày hết thời hiệu kháng cáo"
                {...register("title")}
              />
            </Field>

            <Field label="Loại thời hạn">
              <Select
                value={watchedCategory}
                onValueChange={(v) =>
                  setValue("category", v as DeadlineCreateInput["category"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(deadlineCategoryLabel).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Ngày đến hạn" required>
              <Input type="date" {...register("dueAt", { valueAsDate: true })} />
            </Field>

            <Field label="Cơ sở tính">
              <Input
                placeholder="vd: ngày nhận bản án 2026-05-01 + 15 ngày"
                {...register("basis")}
              />
            </Field>

            <Field label="Nhắc trước (ngày)">
              <Input
                type="number"
                min={0}
                max={60}
                className="font-mono tabular"
                {...register("remindDays", { valueAsNumber: true })}
              />
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
              Thêm thời hạn
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============ AddHearingDialog ============

export function AddHearingDialog({
  open,
  onOpenChange,
  procedures,
  defaultProcedureId,
  hearingCounts,
  proceduresDetail
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  procedures: { id: string; label: string }[];
  defaultProcedureId: string;
  hearingCounts?: Record<string, number>;
  /** Thông tin bổ sung của thủ tục (toà xét xử...), dùng để điền sẵn */
  proceduresDetail?: Record<string, { handlingAgency?: string | null; panel?: string | null; jurisdiction?: string | null }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors }
  } = useForm<HearingCreateInput>({
    resolver: zodResolver(hearingCreateSchema),
    defaultValues: {
      procedureId: defaultProcedureId,
      title: "",
      startsAt: new Date(),
      endsAt: undefined,
      room: "",
      address: "",
      judge: "",
      contact: "",
      notes: ""
    }
  });

  const watchedProcedureId = useWatch({ name: "procedureId", control });

  const autoTitle = useCallback((procId: string) => {
    const proc = procedures.find(p => p.id === procId);
    if (!proc) return;
    const count = (hearingCounts?.[procId] ?? 0) + 1;
    const numStr = CN_NUM[count] ?? String(count);
    setValue("title", `${proc.label}phiên tòa lần thứ ${numStr}`);
  }, [procedures, hearingCounts, setValue]);

  // Khi mở, đồng bộ thủ tục mặc định + tự sinh chủ đề
  useEffect(() => {
    if (!open) return;
    setValue("procedureId", defaultProcedureId);
    autoTitle(defaultProcedureId);
  }, [open, defaultProcedureId, autoTitle, setValue]);

  function handleSummonsUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      try {
        const result = await parseSummons(fd);
        if (result.hearingDate && result.hearingTime) {
          const dt = `${result.hearingDate}T${result.hearingTime}`;
          setValue("startsAt", new Date(dt));
        } else if (result.hearingDate) {
          setValue("startsAt", new Date(`${result.hearingDate}T09:00`));
        }
        if (result.courtRoom) setValue("room", result.courtRoom);
        if (result.judge) setValue("judge", result.judge);
        if (result.caseNumber || result.parties) {
          const parts: string[] = [];
          if (result.caseNumber) parts.push(`Số án: ${result.caseNumber}`);
          if (result.parties?.length) parts.push(`Các bên: ${result.parties.join(", ")}`);
          setValue("notes", parts.join("\n"));
        }
        toast.success("Đã nhận diện giấy triệu tập, vui lòng kiểm tra");
      } catch (err) {
        toast.error("Nhận diện giấy triệu tập thất bại", {
          description: err instanceof Error ? err.message : "vui lòng nhập tay"
        });
      } finally {
        setOcrLoading(false);
        // reset file input so same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  function onSubmit(values: HearingCreateInput) {
    startTransition(async () => {
      try {
        await addHearing(values);
        toast.success("Đã thêm phiên tòa");
        reset();
        onOpenChange(false);
      } catch (err) {
        toast.error("Thêm thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Thêm phiên tòa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            {/* Tải ảnh giấy triệu tập */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={handleSummonsUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={ocrLoading}
                onClick={() => fileInputRef.current?.click()}
              >
                {ocrLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ScanText className="h-3.5 w-3.5" />
                )}
                {ocrLoading ? "Đang nhận diện…" : "Tải ảnh giấy triệu tập để nhận diện"}
              </Button>
              <span className="text-[11px] text-muted-foreground">
                Tải ảnh giấy triệu tập, AI tự động điền thông tin phiên tòa
              </span>
            </div>

            <Field label="Chủ đề" required error={errors.title?.message}>
              <Input placeholder="vd: phiên tòa lần 1" {...register("title")} />
            </Field>

            {/* Thủ tục + Toà xét xử cùng một dòng */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Thủ tục" required>
                <Select
                  value={watchedProcedureId || undefined}
                  onValueChange={(v) => {
                    setValue("procedureId", v);
                    autoTitle(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn thủ tục" />
                  </SelectTrigger>
                  <SelectContent>
                    {procedures.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Toà xét xử">
                <Input
                  readOnly
                  value={proceduresDetail?.[watchedProcedureId]?.handlingAgency ?? "—"}
                  className="bg-muted/50 text-muted-foreground"
                />
              </Field>
            </div>

            {/* Thời gian mở phiên tòa + Phòng xét xử cùng một dòng */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Thời gian mở phiên tòa" required>
                <Input
                  type="datetime-local"
                  {...register("startsAt", { valueAsDate: true })}
                />
              </Field>
              <Field label="Phòng xét xử">
                <Input placeholder="vd: Phòng xét xử số 3" {...register("room")} />
              </Field>
            </div>

            {/* Chủ tọa/Trọng tài viên + Liên hệ cùng một dòng */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Chủ tọa / Trọng tài viên">
                <Input {...register("judge")} />
              </Field>
              <Field label="Liên hệ">
                <Input placeholder="SĐT thẩm phán / thư ký" {...register("contact")} />
              </Field>
            </div>

            <Field label="Địa điểm mở phiên tòa">
              <Input placeholder="vd: số XX đường XX, Toà án XX" {...register("address")} />
            </Field>

            <Field label="Ghi chú">
              <Textarea rows={4} {...register("notes")} />
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
              Thêm phiên tòa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============ Shared Field ============

function Field({
  label,
  required,
  error,
  children
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-xs">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
