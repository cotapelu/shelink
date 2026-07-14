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
      <Field label="Luật sư phụ trách" required>
        <Select
          value={ownerUserId || ""}
          onValueChange={(v) => setValue("ownerUserId", v, { shouldDirty: true })}
        >
          <SelectTrigger className="h-10 bg-background">
            <SelectValue placeholder="Chọn Luật sư phụ trách" />
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
      <Field label="Nhân sự hỗ trợ (có thể chọn nhiều)">
        <Select
          multiple
          value={coUserIds as any}
          onValueChange={(values) => setValue("coUserIds", values, { shouldDirty: true })}
        >
          <SelectTrigger className="h-10 bg-background">
            <SelectValue placeholder="Chọn nhân sự hỗ trợ" />
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

      {/* Cần备案 cho hiệp hội Luật sư? */}
      <Field label="Cần với Hiệp hội Luật sư không?">
        <Select
          value={barFiling ?? ""}
          onValueChange={(v) => setValue("barFiling", v, { shouldDirty: true })}
        >
          <SelectTrigger className="h-10 bg-background">
            <SelectValue placeholder="Chọn" />
          </SelectTrigger>
          <SelectContent>
            {/* TODO: BAR_FILING_OPTIONS */}
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
    </div>
  );
}
