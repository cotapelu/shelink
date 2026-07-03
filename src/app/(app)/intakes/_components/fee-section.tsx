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
        {/* 顾问费不含风险代理 */}
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
          <Field label="总金额（元）" required>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="0.00"
              className="font-mono"
              {...register("feeAmount", { valueAsNumber: true })}
            />
          </Field>
          <Field label="付款节点 / 分期约定">
            <Input
              placeholder="如：签约付 50%，开庭前付 30%，结案付 20%"
              {...register("feeSchedule")}
            />
          </Field>
        </div>
      )}

      {feeType === "TIMED" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="小时费率（元 / 小时）" required>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="0.00"
              className="font-mono"
              {...register("feeAmount", { valueAsNumber: true })}
            />
          </Field>
          <Field label="计费说明 / 结算周期">
            <Input
              placeholder="如：合伙人 2000 元/时、授薪律师 1000 元/时；按月结算"
              {...register("feeSchedule")}
            />
          </Field>
        </div>
      )}

      {feeType === "CONTINGENCY" && (
        <>
          <Field label="基础办案费（元）" required>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="0.00"
              className="font-mono"
              {...register("feeAmount", { valueAsNumber: true })}
            />
          </Field>
          <Field label="风险代理收费方式" required hint="例：判决/调解执行到位后按到账金额 15% 收取；或：以胜诉金额阶梯计提：≤100 万部分 10%，>100 万部分 8%">
            <Textarea
              rows={3}
              placeholder="详细描述风险代理收费方式 / 触发条件 / 计提比例"
              {...register("contingencyTerms")}
            />
          </Field>
          <Field label="付款节点">
            <Input
              placeholder="如：基础办案费签约付清；风险费执行到账后 7 日内支付"
              {...register("feeSchedule")}
            />
          </Field>
        </>
      )}

      {feeType && (
        <Field label="费用备注（可选）">
          <Input placeholder="如：含差旅 / 含诉讼费垫付" {...register("feeNote")} />
        </Field>
      )}
    </>
  );
}
