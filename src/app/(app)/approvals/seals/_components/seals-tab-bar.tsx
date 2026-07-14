"use client";

import { TabBtn, Count } from "./tab-btn";

export type SealsTab = "allMine" | "pending" | "processed" | "toApprove" | "firm";

interface SealsTabBarProps {
  tab: SealsTab;
  setTab: (tab: SealsTab) => void;
  mineCount: number;
  pendingCount: number;
  processedCount: number;
  toApproveCount: number;
  allCount: number;
  canApprove: boolean;
  canViewFirmQueue: boolean;
  firmTabLabel: string;
}

export function SealsTabBar({
  tab,
  setTab,
  mineCount,
  pendingCount,
  processedCount,
  toApproveCount,
  allCount,
  canApprove,
  canViewFirmQueue,
  firmTabLabel
}: SealsTabBarProps) {
  return (
    <div className="border-b border-border">
      <div className="flex gap-5">
        <TabBtn active={tab === "allMine"} onClick={() => setTab("allMine")}>
          我的申请
          <Count n={mineCount} />
        </TabBtn>
        <TabBtn active={tab === "pending"} onClick={() => setTab("pending")}>
          待审批
          <Count n={pendingCount} hot={pendingCount > 0} />
        </TabBtn>
        <TabBtn active={tab === "processed"} onClick={() => setTab("processed")}>
          已审批
          <Count n={processedCount} />
        </TabBtn>
        {canApprove && (
          <TabBtn active={tab === "toApprove"} onClick={() => setTab("toApprove")}>
            待我审批
            <Count n={toApproveCount} hot={toApproveCount > 0} />
          </TabBtn>
        )}
        {canViewFirmQueue && (
          <TabBtn active={tab === "firm"} onClick={() => setTab("firm")}>
            {firmTabLabel}
            <Count n={allCount} />
          </TabBtn>
        )}
      </div>
    </div>
  );
}
