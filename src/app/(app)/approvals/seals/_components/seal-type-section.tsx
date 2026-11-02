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
      <Label className="text-[11px]">Loại dấu *</Label>
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
          <span>Đóng đồng thời <strong className="text-foreground">dấu người đại diện theo pháp luật</strong></span>
          <span className="text-[10px] text-muted-foreground">
            Tự tạo một lượt duyệt dấu người đại diện đi kèm, chạy song song với lượt này
          </span>
        </label>
      )}
    </div>
  );
}
