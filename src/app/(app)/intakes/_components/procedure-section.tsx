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
      {/* Nguyên nhân vụ án | Thủ tục hiện tại | Có thẩm quyền | Cơ quan giải quyết tranh chấp */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        {/* Thủ tục hiện tại */}
        <Field label="Thủ tục hiện tại" required error={errors.firstProcedureType?.message}>
          <Select
            value={firstProcedureType ?? ""}
            onValueChange={(v) => {
              const proc = v as ProcedureType;
              setValue("firstProcedureType", proc, { shouldDirty: true, shouldValidate: true });
              onProcedureChange?.(proc);
            }}
          >
            <SelectTrigger className="h-10 bg-background">
              <SelectValue placeholder="Chọn thủ tục hiện tại" />
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

        {/* Có thẩm quyền */}
        <Field label="Có thẩm quyền">
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
            placeholder="Nhập địa điểm có thẩm quyền"
            className="h-10"
          />
        </Field>

        {/* Cơ quan giải quyết tranh chấp */}
        <Field label="Cơ quan giải quyết tranh chấp">
          <Select
            value={firstAgency || ""}
            onValueChange={(v) => setValue("firstAgency", v, { shouldDirty: true })}
            disabled={agencyOpts.length === 0}
          >
            <SelectTrigger className="h-10 bg-background">
              <SelectValue placeholder={jurisdiction ? "Chọn cơ quan" : "Vui lòng chọn khu vực có thẩm quyền trước"} />
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

        {/* Spacer for grid alignment (Cơ quan giải quyết tranh chấp occupies 1/4) */}
        <div></div>
      </div>

      {/* Vị trí tố tụng của chúng tôi (chỉ cho tố tụng) */}
      {showStanding && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Vị trí tố tụng của chúng tôi" required error={errors.ourStanding?.message}>
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
                <SelectValue placeholder="Chọn vị trí tố tụng" />
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

          {/* Cần với Hiệp hội Luật sư? */}
          <Field label="Cần với Hiệp hội Luật sư không?">
            <Select
              value={barFiling ?? ""}
              onValueChange={(v) => setValue("barFiling", v as BarFilingType, { shouldDirty: true })}
            >
              <SelectTrigger className="h-10 bg-background">
                <SelectValue placeholder="Chọn" />
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

          {/* Có phản tố? */}
          <Field label="Có phản tố không?">
            <Select
              value={counterclaim ? "yes" : "no"}
              onValueChange={(v) => setValue("counterclaim", v === "yes", { shouldDirty: true })}
            >
              <SelectTrigger className="h-10 bg-background">
                <SelectValue placeholder="Chọn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">Không</SelectItem>
                <SelectItem value="yes">Có</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Spacer */}
          <div></div>
        </div>
      )}

      {/* Non-litigation: Loại hình dịch vụ, Giá trị dự án, Phạm vi thời gian, Loại tư vấn, etc. */}
      {kind !== "litigation" && (
        <>
          {/* Loại hình dịch vụ */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Loại hình dịch vụ">
              <Select
                value={""}
                onValueChange={() => {}}
              >
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="Chọn loại hình dịch vụ" />
                </SelectTrigger>
                <SelectContent>
                  {/* TODO: fill from PROJECT_BUSINESS_TYPES */}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Giá trị dự án (VNĐ)">
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
