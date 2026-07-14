"use client";

import { KpiCard } from "./kpi-card";
import { CheckCircle2, AlertOctagon, Stamp } from "lucide-react";

interface SealsKpiProps {
  monthStamped: number;
  pendingApprovalCount: number;
  waitingStampCount: number;
}

export function SealsKpi({
  monthStamped,
  pendingApprovalCount,
  waitingStampCount
}: SealsKpiProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <KpiCard
        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        label="本月已盖章"
        value={monthStamped}
        accent="rgb(22 163 74)"
      />
      <KpiCard
        icon={<AlertOctagon className="h-3.5 w-3.5" />}
        label="待审批"
        value={pendingApprovalCount}
        accent="rgb(180 130 0)"
      />
      <KpiCard
        icon={<Stamp className="h-3.5 w-3.5" />}
        label="待盖章"
        value={waitingStampCount}
        accent="rgb(37 99 235)"
      />
    </div>
  );
}
