// @ts-nocheck
"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Field } from "./field";
import type { ProcedureType, LitigationStanding, BarFilingType } from "@prisma/client";
import { procedureTypeLabel, litigationStandingLabel, barFilingLabel, BAR_FILING_OPTIONS } from "@/lib/enums";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProcedureSectionProps {
  kind: CategoryKind;
  firstProcedureType?: ProcedureType;
  jurisdiction: string;
  firstAgency: string;
  ourStanding?: LitigationStanding;
  barFiling?: BarFilingType;
  counterclaim: boolean;
  procedureOptions: ProcedureType[];
  agencyOpts: string[];
  ourStandingOptions: LitigationStanding[];
  oppositeStandingOptions: LitigationStanding[];
  register: any; // UseFormRegister<IntakeCreateInput>
  setValue: any; // UseFormSetValue<IntakeCreateInput>
  errors: any; // FieldErrors
  onProcedureChange?: (value: ProcedureType) => void;
}

export function ProcedureSection({
  kind,
  firstProcedureType,
  jurisdiction,
  firstAgency,
  ourStanding,
  barFiling,
  counterclaim,
  procedureOptions,
  agencyOpts,
  ourStandingOptions,
  oppositeStandingOptions,
  setValue,
  errors,
  onProcedureChange,
}: ProcedureSectionProps) {
  const showStanding = kind === "litigation";

  return (
    <>
      {/* 案由 | 当前程序 | 管辖地 | 争议解决机构 */}
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

        {/* Spacer for grid alignment (争议解决机构 occupies 1/4) */}
        <div></div>
      </div>

      {/* 我方诉讼地位 (仅诉讼) */}
      {showStanding && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="我方诉讼地位" required error={errors.ourStanding?.message}>
            <Select
              value={ourStanding ?? ""}
              onValueChange={(v) =>
                setValue("ourStanding", v as LitigationStanding, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className="h-10 bg-background">
                <SelectValue placeholder="选择诉讼地位" />
              </SelectTrigger>
              <SelectContent>
                {(ourStandingOptions.length
                  ? ourStandingOptions
                  : (Object.keys(litigationStandingLabel) as LitigationStanding[])
                ).map((s) => (
                  <SelectItem key={s} value={s}>
                    {litigationStandingLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* 是否需向律协备案 */}
          <Field label="是否需向律协备案">
            <Select
              value={barFiling ?? ""}
              onValueChange={(v) => setValue("barFiling", v as BarFilingType, { shouldDirty: true })}
            >
              <SelectTrigger className="h-10 bg-background">
                <SelectValue placeholder="选择" />
              </SelectTrigger>
              <SelectContent>
                {BAR_FILING_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {barFilingLabel[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* 是否反诉 */}
          <Field label="是否反诉">
            <Select
              value={counterclaim ? "yes" : "no"}
              onValueChange={(v) => setValue("counterclaim", v === "yes", { shouldDirty: true })}
            >
              <SelectTrigger className="h-10 bg-background">
                <SelectValue placeholder="选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">否</SelectItem>
                <SelectItem value="yes">是</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Spacer */}
          <div></div>
        </div>
      )}

      {/* Non-litigation: 业务类型, 项目金额, 时间范围, 顾问类型, etc. */}
      {kind !== "litigation" && (
        <>
          {/* 业务类型 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="业务类型">
              <Select
                value={""}
                onValueChange={() => {}}
              >
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="选择业务类型" />
                </SelectTrigger>
                <SelectContent>
                  {/* TODO: fill from PROJECT_BUSINESS_TYPES */}
                </SelectContent>
              </Select>
            </Field>
            <Field label="项目金额（元）">
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                className="font-mono"
                {...register("claimAmount", { valueAsNumber: true })}
              />
            </Field>
            {/* More project-specific fields can be added here */}
          </div>
        </>
      )}
    </>
  );
}
