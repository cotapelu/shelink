"use client";

import { Briefcase } from "lucide-react";
import type { MatterCategory, MatterStatus, PartyRole, LitigationStanding } from "@prisma/client";
import { Field } from "./field";
import { formatDate } from "./date-utils";
import { matterCategoryLabel, matterStatusLabel, litigationStandingLabel } from "@/lib/enums";

const partyRoleLabel: Record<PartyRole, string> = {
  CLIENT_PARTY: "委托方",
  OPPOSING_PARTY: "对方",
  THIRD_PARTY: "第三人",
  CO_LITIGANT: "共同诉讼人",
  AGENT: "代理人",
  WITNESS: "证人",
  OTHER: "其他"
};

export interface MatterInfo {
  matterId: string | null;
  canViewMatter: boolean;
  internalCode: string;
  title: string;
  category: MatterCategory;
  status: MatterStatus;
  intakeDate: string | null;
  causeText: string | null;
  ownerName: string | null;
  partyRole: PartyRole;
  partyStanding: LitigationStanding | null;
}

interface MatterContextProps {
  info: MatterInfo;
  hit: { matchedName: string };
}

export function MatterContext({ info, hit }: MatterContextProps) {
  const causeOrCategory = info.causeText ?? matterCategoryLabel[info.category];
  return (
    <div className="mt-2 rounded border border-border/80 bg-background/70 p-2.5 text-[12px]">
      <div className="mb-2 flex items-center gap-1.5">
        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-[11px] text-muted-foreground">{info.internalCode}</span>
        <span className="min-w-0 truncate font-medium text-foreground">{info.title}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-muted-foreground md:grid-cols-3">
        <Field label="系统收案">{formatDate(info.intakeDate)}</Field>
        <Field label="当前状态">{matterStatusLabel[info.status]}</Field>
        <Field label="案由/类型">{causeOrCategory}</Field>
        <Field label="主办律师">{info.ownerName ?? "—"}</Field>
        <Field label="命中角色">
          {partyRoleLabel[info.partyRole]}
          {info.partyStanding ? ` · ${litigationStandingLabel[info.partyStanding]}` : ""}
        </Field>
        <Field label="命中主体">{hit.matchedName}</Field>
      </div>
    </div>
  );
}
