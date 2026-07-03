"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Field } from "./field";
import type { ProcedureType, LitigationStanding, BarFilingType } from "@prisma/client";
import { litigationStandingLabel, BAR_FILING_OPTIONS } from "@/lib/enums";
import type { UseFormRegister, UseFormSetValue } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import type { IntakeCreateInput } from "@/server/intakes/schemas";
import { ProcedureCombobox } from "./procedure-combobox"; // Assume exists or use Select
import { JurisdictionSelect } from "./jurisdiction-select";
import { AgencySelect } from "./agency-select";

interface ProcedureSectionProps {
  kind: CategoryKind;
  firstProcedureType?: ProcedureType;
  jurisdiction: string;
  firstAgency: string;
  ourStanding?: LitigationStanding;
  barFiling?: BarFilingType;
  counterclaim: boolean;
  procedureOptions: ProcedureType[];
  agencyOpts: Array<{ label: string; value: string }>;
  ourStandingOptions: LitigationStanding[];
  oppositeStandingOptions: LitigationStanding[];
  register: UseFormRegister<IntakeCreateInput>;
  setValue: UseFormSetValue<IntakeCreateInput>;
  errors: FieldErrors;
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
  register,
  setValue,
  errors,
  onProcedureChange,
}: ProcedureSectionProps) {
  const showStanding = kind === "litigation";

  return (
    <>
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
        <JurisdictionSelect
          value={jurisdiction}
          onChange={(v) => setValue("jurisdiction", v, { shouldDirty: true })}
        />
      </Field>

      {/* 争议解决机构 */}
      <Field label="争议解决机构">
        <AgencySelect
          value={firstAgency}
          options={agencyOpts}
          onChange={(v) => setValue("firstAgency", v, { shouldDirty: true })}
        />
      </Field>

      {/* 我方诉讼地位 (仅诉讼) */}
      {showStanding && (
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
      )}

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
    </>
  );
}

// Note: We need to import Select, SelectContent, SelectItem, SelectTrigger, SelectValue from ui/select
// Also imports for procedureTypeLabel, barFilingLabel, matterCategoryLabel? Actually procedureTypeLabel used, but we use ProcedureCombobox maybe.
// For simplicity, we can use Select directly.
