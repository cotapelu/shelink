"use client";

import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PARTY_GRID, PARTY_GRID_NO_STANDING } from "@/app/(app)/matters/_components/party-card";
import { litigationStandingLabel } from "@/lib/enums";
import type { LitigationStanding, PartyRole } from "@prisma/client";
import type { EnterpriseSearchItem } from "@/server/yuandian/enterprise";
import { PartyCard } from "@/app/(app)/matters/_components/party-card";
import { ClientCombobox } from "./client-combobox";
import type { UseFormSetValue } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import type { IntakeCreateInput } from "@/server/intakes/schemas";
import type { CategoryKind } from "@/lib/enums";

interface PartiesSectionProps {
  mode: CategoryKind;
  parties: Array<{ id: string }>;
  watchedParties: any[];
  ourStanding?: LitigationStanding;
  ourStandingOptions: LitigationStanding[];
  oppositeStandingOptions: LitigationStanding[];
  setValue: UseFormSetValue<IntakeCreateInput>;
  errors: FieldErrors;
  onRemove: (index: number) => void;
  clientId: string;
  clientOptions: Array<{ id: string; name: string }>;
  onPickYuandian: (candidate: EnterpriseSearchItem) => void;
}

export function PartiesSection({
  mode,
  parties,
  watchedParties,
  ourStanding,
  ourStandingOptions,
  oppositeStandingOptions,
  setValue,
  errors,
  onRemove,
  clientId,
  clientOptions,
  onPickYuandian,
}: PartiesSectionProps) {
  const showStanding = mode === "litigation";
  const grid = showStanding ? PARTY_GRID : PARTY_GRID_NO_STANDING;
  const clientLabel =
    mode === "counsel" ? "顾问单位" : mode === "project" ? "委托方" : "客户";

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-muted/25 p-2">
      <div className={cn("space-y-2", showStanding ? "min-w-[980px]" : "min-w-[840px]")}>
        {/* 表头 */}
        <div
          className={cn(
            grid,
            "rounded-md bg-muted/70 px-2.5 py-2 text-[11px] font-medium text-muted-foreground"
          )}
        >
          <span>角色</span>
          <span>主体类型</span>
          <span>姓名 / 名称</span>
          <span>证件号 / 信用代码</span>
          {showStanding && (
            <span>
              诉讼地位<span className="ml-0.5 text-destructive">*</span>
            </span>
          )}
          <span>联系人</span>
          <span>联系电话</span>
          <span className="text-right">操作</span>
        </div>

        {parties.map((p, idx) => {
          const all = (watchedParties ?? []) as { role?: string }[];
          const role = (all[idx]?.role as PartyRole) ?? "OPPOSING_PARTY";
          const isClient = role === "CLIENT_PARTY";
          // 顾问类只显示委托方
          if (mode === "counsel" && !isClient) return null;
          return (
            <PartyCard
              key={p.id}
              index={idx}
              fieldPrefix="parties"
              showStanding={showStanding}
              removable={!isClient}
              onRemove={() => onRemove(idx)}
              errors={errors as never}
              roleSlot={
                isClient ? (
                  <div className="flex h-9 w-full items-center justify-center rounded-sm border border-primary/30 bg-primary/10 text-xs font-medium text-primary">
                    {clientLabel}
                  </div>
                ) : (
                  <Select
                    value={role}
                    onValueChange={(v) =>
                      setValue(`parties.${idx}.role`, v as PartyRole, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger className="h-9 w-full bg-background px-2.5 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPPOSING_PARTY" className="text-xs">
                        相对方
                      </SelectItem>
                      <SelectItem value="THIRD_PARTY" className="text-xs">
                        第三方
                      </SelectItem>
                      <SelectItem value="OTHER" className="text-xs">
                        关联方
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )
              }
              standingSlot={
                !showStanding ? undefined : isClient ? (
                  <div className="space-y-1">
                    <Select
                      value={ourStanding ?? ""}
                      onValueChange={(v) =>
                        setValue("ourStanding", v as LitigationStanding, {
                          shouldDirty: true,
                          shouldValidate: true
                        })
                      }
                    >
                      <SelectTrigger className="h-9 w-full bg-background px-2.5 text-xs">
                        <SelectValue placeholder="诉讼地位" />
                      </SelectTrigger>
                      <SelectContent>
                        {(ourStandingOptions.length
                          ? ourStandingOptions
                          : (Object.keys(litigationStandingLabel) as LitigationStanding[])
                        ).map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {litigationStandingLabel[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.ourStanding?.message && (
                      <p className="text-xs text-destructive">{errors.ourStanding.message as string}</p>
                    )}
                  </div>
                ) : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
