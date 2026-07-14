"use client";

import { Field } from "./field";
import { Input } from "@/components/ui/input";

interface ClaimSectionProps {
  register: any;
}

export function ClaimSection({ register }: ClaimSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <Field label="Giá trị yêu cầu (VNĐ)">
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
            className="font-mono"
            {...register("claimAmount", { valueAsNumber: true })}
          />
        </Field>
        <Field label="Mô tả yêu cầu (các yêu cầu không phải tiền hoặc khiếu nại khác)" className="sm:col-span-3">
          <Input
            placeholder="Ví dụ: yêu cầu xác nhận hợp đồng có hiệu lực / yêu cầu ngừng xâm phạm"
            {...register("claimDescription")}
          />
        </Field>
      </div>
    </>
  );
}
