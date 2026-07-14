"use client";

import { Label } from "@/components/ui/label";
import { RadioChips } from "@/components/ui/radio-chips";
import { Checkbox } from "@/components/ui/checkbox";
import type { SealTypeConfigRow } from "./seal-types";
import { SEAL_TYPE_CN } from "./seal-types";

interface SealTypeSectionProps {
  enabledConfigs: SealTypeConfigRow[];
  sealType: string;
  setSealType: (value: string) => void;
  alsoLegalRep: boolean;
  setAlsoLegalRep: (value: boolean) => void;
}

export function SealTypeSection({
  enabledConfigs,
  sealType,
  setSealType,
  alsoLegalRep,
  setAlsoLegalRep
}: SealTypeSectionProps) {
  return (
    <div className="md:col-span-2">
      <Label className="text-[11px]">章种类 *</Label>
      <RadioChips
        className="mt-2"
        items={enabledConfigs.map((c) => ({
          value: c.type as string,
          label: SEAL_TYPE_CN[c.type] ?? c.type,
          description: c.description ?? undefined
        }))}
        value={sealType}
        onChange={setSealType}
      />
      {sealType && (
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          {enabledConfigs.find((c) => c.type === sealType)?.description}
        </p>
      )}
      {sealType && sealType !== "LEGAL_REP_SEAL" && (
        <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-background px-2.5 py-1.5 text-[12px]">
          <Checkbox
            checked={alsoLegalRep}
            onCheckedChange={(v) => setAlsoLegalRep(v === true)}
          />
          <span>同时加盖 <strong className="text-foreground">法定代表人章</strong></span>
          <span className="text-[10px] text-muted-foreground">
            会自动建一条配套的法人章审批，与本章并行
          </span>
        </label>
      )}
    </div>
  );
}
