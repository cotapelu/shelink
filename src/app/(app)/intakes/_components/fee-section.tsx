"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "./field";
import type { FeeType } from "@prisma/client";
import { feeTypeLabel } from "@/lib/enums";
import type { UseFormRegister, UseFormSetValue } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import type { IntakeCreateInput } from "@/server/intakes/schemas";
import type { CategoryKind } from "@/lib/enums";

const FEE_TYPES: FeeType[] = ["FIXED", "CONTINGENCY", "TIMED"];

interface FeeSectionProps {
  kind: CategoryKind;
  feeType?: FeeType;
  register: UseFormRegister<IntakeCreateInput>;
  setValue: UseFormSetValue<IntakeCreateInput>;
  errors: FieldErrors;
}

export function FeeSection({ kind, feeType, register, setValue, errors }: FeeSectionProps) {
  return (
    <>
      <div
        className={cn(
          "grid grid-cols-1 gap-2",
          kind === "counsel" ? "sm:grid-cols-2" : "sm:grid-cols-3"
        )}
      >
        {/* Phí tư vấn không gồm theo kết quả */}
        {FEE_TYPES.filter((t) => kind !== "counsel" || t !== "CONTINGENCY").map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setValue("feeType", t, { shouldDirty: true })}
            className={cn(
              "rounded-md border px-3 py-2 text-sm transition-colors",
              feeType === t
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-input"
            )}
          >
            {feeTypeLabel[t]}
          </button>
        ))}
      </div>

      {feeType === "FIXED" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Tổng số tiền (VNĐ)" required>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="0.00"
              className="font-mono"
              {...register("feeAmount", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Mốc thanh toán / Thoả thuận trả góp">
            <Input
              placeholder="vd: trả 50% khi ký, 30% trước phiên tòa, 20% khi kết thúc"
              {...register("feeSchedule")}
            />
          </Field>
        </div>
      )}

      {feeType === "TIMED" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Phí theo giờ (VNĐ / giờ)" required>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="0.00"
              className="font-mono"
              {...register("feeAmount", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Diễn giải tính phí / Chu kỳ quyết toán">
            <Input
              placeholder="vd: cộng sự 2000 VNĐ/giờ, luật sư lương 1000 VNĐ/giờ; quyết toán theo tháng"
              {...register("feeSchedule")}
            />
          </Field>
        </div>
      )}

      {feeType === "CONTINGENCY" && (
        <>
          <Field label="Phí xử lý cơ bản (VNĐ)" required>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="0.00"
              className="font-mono"
              {...register("feeAmount", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Cách tính phí theo kết quả" required hint="vd: sau khi bản án/hòa giải thi hành xong thì thu 15% số tiền về; hoặc tính theo bậc số tiền thắng kiện: phần ≤100 triệu 10%, phần >100 triệu 8%">
            <Textarea
              rows={3}
              placeholder="Mô tả chi tiết cách tính phí theo kết quả / điều kiện kích hoạt / tỷ lệ tính"
              {...register("contingencyTerms")}
            />
          </Field>
          <Field label="Mốc thanh toán">
            <Input
              placeholder="vd: phí xử lý cơ bản trả hết khi ký; phí theo kết quả trả trong 7 ngày sau khi thi hành xong"
              {...register("feeSchedule")}
            />
          </Field>
        </>
      )}

      {feeType && (
        <Field label="Ghi chú phí (tuỳ chọn)">
          <Input placeholder="vd: đã gồm công tác / đã tạm ứng lệ phí tố tụng" {...register("feeNote")} />
        </Field>
      )}
    </>
  );
}
