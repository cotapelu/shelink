"use client";

import { Briefcase } from "lucide-react";
import type { MatterCategory, MatterStatus, PartyRole, LitigationStanding } from "@prisma/client";
import { Field } from "./field";
import { formatDate } from "./date-utils";
import { matterCategoryLabel, matterStatusLabel, litigationStandingLabel } from "@/lib/enums";

const partyRoleLabel: Record<PartyRole, string> = {
  CLIENT_PARTY: "Bên ủy quyền",
  OPPOSING_PARTY: "Bên đối phương",
  THIRD_PARTY: "Người thứ ba",
  CO_LITIGANT: "Đồng khởi kiện",
  AGENT: "Người đại diện",
  WITNESS: "Nhân chứng",
  OTHER: "Khác"
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
        <Field label="Tiếp nhận hệ thống">{formatDate(info.intakeDate)}</Field>
        <Field label="Trạng thái hiện tại">{matterStatusLabel[info.status]}</Field>
        <Field label="Nguyên nhân/loại">{causeOrCategory}</Field>
        <Field label="Luật sư chủ trì">{info.ownerName ?? "—"}</Field>
        <Field label="Vai trò khớp">
          {partyRoleLabel[info.partyRole]}
          {info.partyStanding ? ` · ${litigationStandingLabel[info.partyStanding]}` : ""}
        </Field>
        <Field label="Chủ thể khớp">{hit.matchedName}</Field>
      </div>
    </div>
  );
}
