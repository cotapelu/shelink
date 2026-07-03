// @ts-nocheck
"use client";

import { Field } from "./field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProcedureType } from "@prisma/client";
import { procedureTypeLabel } from "@/lib/enums";
import type { UseFormSetValue } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import type { IntakeCreateInput } from "@/server/intakes/schemas";

interface ProcedureCoreSectionProps {
  firstProcedureType?: ProcedureType;
  jurisdiction: string;
  firstAgency: string;
  procedureOptions: ProcedureType[];
  agencyOpts: string[];
  setValue: UseFormSetValue<IntakeCreateInput>;
  errors: FieldErrors;
  onProcedureChange?: (value: ProcedureType) => void;
}

export function ProcedureCoreSection({
  firstProcedureType,
  jurisdiction,
  firstAgency,
  procedureOptions,
  agencyOpts,
  setValue,
  errors,
  onProcedureChange,
}: ProcedureCoreSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
      {/* 当前程序 */}
      <Field label="当前程序" required error={errors.firstProcedureType?.message}>
        <Select
          value={firstProcedureType ?? ""}
          onValueChange={(v) => {
            const proc = v as ProcedureType;
            setValue("firstProcedureType", proc, { shouldDirty: true, shouldValidate: true });
            onProcedureChange?.(proc);
          }}
        >
          <SelectTrigger className="h-10 bg-background">
            <SelectValue placeholder="选择当前程序" />
          </SelectTrigger>
          <SelectContent>
            {procedureOptions.map((p) => (
              <SelectItem key={p} value={p}>
                {procedureTypeLabel[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* 管辖地 */}
      <Field label="管辖地">
        <Input
          value={jurisdiction}
          onChange={(e) => {
            const v = e.target.value;
            setValue("jurisdiction", v, { shouldDirty: true });
            const cur = firstAgency;
            if (cur && !agencyOpts.includes(cur)) {
              setValue("firstAgency", "", { shouldDirty: true });
            }
          }}
          placeholder="输入管辖地"
          className="h-10"
        />
      </Field>

      {/* 争议解决机构 */}
      <Field label="争议解决机构">
        <Select
          value={firstAgency || ""}
          onValueChange={(v) => setValue("firstAgency", v, { shouldDirty: true })}
          disabled={agencyOpts.length === 0}
        >
          <SelectTrigger className="h-10 bg-background">
            <SelectValue placeholder={jurisdiction ? "选择机构" : "请先选管辖地"} />
          </SelectTrigger>
          <SelectContent>
            {agencyOpts.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Spacer for grid alignment */}
      <div></div>
    </div>
  );
}
