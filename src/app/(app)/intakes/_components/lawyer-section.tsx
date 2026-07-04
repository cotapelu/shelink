// @ts-nocheck
// @ts-nocheck
"use client";

import { Field } from "./field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { UseFormSetValue } from "react-hook-form";

interface LawyerSectionProps {
  ownerUserId?: string;
  coUserIds?: string[];
  barFiling?: any;
  counterclaim: boolean;
  setValue: UseFormSetValue<any>;
  errors: any;
  colleagues: any[];
}

export function LawyerSection({
  ownerUserId,
  coUserIds = [],
  barFiling,
  counterclaim,
  setValue,
  errors,
  colleagues,
}: LawyerSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
      {/* 主办律师 */}
      <Field label="主办律师" required>
        <Select
          value={ownerUserId || ""}
          onValueChange={(v) => setValue("ownerUserId", v, { shouldDirty: true })}
        >
          <SelectTrigger className="h-10 bg-background">
            <SelectValue placeholder="选择主办律师" />
          </SelectTrigger>
          <SelectContent>
            {colleagues
              .filter((c) => c.role === "LAWYER" || c.role === "PRINCIPAL_LAWYER")
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </Field>

      {/* 协办人员 */}
      <Field label="协办人员（可多选）">
        <Select
          multiple
          value={coUserIds as any}
          onValueChange={(values) => setValue("coUserIds", values, { shouldDirty: true })}
        >
          <SelectTrigger className="h-10 bg-background">
            <SelectValue placeholder="选择协办人员" />
          </SelectTrigger>
          <SelectContent>
            {colleagues
              .filter((c) => c.role !== "ADMIN" && c.id !== ownerUserId)
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </Field>

      {/* 是否需向律协备案 */}
      <Field label="是否需向律协备案">
        <Select
          value={barFiling ?? ""}
          onValueChange={(v) => setValue("barFiling", v, { shouldDirty: true })}
        >
          <SelectTrigger className="h-10 bg-background">
            <SelectValue placeholder="选择" />
          </SelectTrigger>
          <SelectContent>
            {/* TODO: BAR_FILING_OPTIONS */}
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
    </div>
  );
}
