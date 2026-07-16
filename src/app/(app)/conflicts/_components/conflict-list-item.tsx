"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { ConflictSeverity, MatterCategory, MatterStatus, PartyRole, LitigationStanding } from "@prisma/client";
import { HitHeader } from "./hit-header";
import { MatterContext, type MatterInfo } from "./matter-context";

export type HitResult = {
  id: string;
  hitType: string;
  targetType: string;
  targetId: string;
  matchedName: string;
  matchedField: string;
  matchedValue: string;
  matchedRatio: number | null;
  severity: ConflictSeverity;
  reason: string;
  matterInfo: MatterInfo | null;
};

interface ConflictListItemProps {
  hit: HitResult;
}

export function ConflictListItem({ hit }: ConflictListItemProps) {
  const targetHref =
    hit.matterInfo?.canViewMatter && hit.matterInfo.matterId
      ? `/matters/${hit.matterInfo.matterId}`
      : hit.targetType === "Client"
        ? `/clients/${hit.targetId}`
        : null;

  return (
    <li className="rounded-md border p-3" style={{ borderColor: `${getColor(hit.severity)}40`, backgroundColor: getBg(hit.severity) }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 overflow-hidden">
          <HitHeader
            severity={hit.severity}
            hitType={hit.hitType}
            reason={hit.reason}
            matchedField={hit.matchedField}
            matchedValue={hit.matchedValue}
            matchedRatio={hit.matchedRatio}
          />
          {hit.matterInfo && <MatterContext info={hit.matterInfo} hit={hit} />}
        </div>
        {targetHref && (
          <Link href={targetHref} className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline">
            查看
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </li>
  );
}

function getColor(severity: ConflictSeverity): string {
  const colors: Record<ConflictSeverity, string> = {
    BLOCKING: "#F87171",
    HIGH: "#FB923C",
    MEDIUM: "#FBBF24",
    LOW: "#4ADE80"
  };
  return colors[severity];
}

function getBg(severity: ConflictSeverity): string {
  const bgs: Record<ConflictSeverity, string> = {
    BLOCKING: "rgba(248,113,113,0.12)",
    HIGH: "rgba(251,146,60,0.12)",
    MEDIUM: "rgba(251,191,36,0.12)",
    LOW: "rgba(74,222,128,0.12)"
  };
  return bgs[severity];
}
