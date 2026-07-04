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
        <Field label="标的额（元）">
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
            className="font-mono"
            {...register("claimAmount", { valueAsNumber: true })}
          />
        </Field>
        <Field label="标的描述（非金钱标的或其他诉求）" className="sm:col-span-3">
          <Input
            placeholder="如：请求确认合同有效 / 请求停止侵害"
            {...register("claimDescription")}
          />
        </Field>
      </div>
    </>
  );
}
