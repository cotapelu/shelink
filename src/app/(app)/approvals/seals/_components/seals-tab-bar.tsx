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
          Yêu cầu của tôi
          <Count n={mineCount} />
        </TabBtn>
        <TabBtn active={tab === "pending"} onClick={() => setTab("pending")}>
          Chờ duyệt
          <Count n={pendingCount} hot={pendingCount > 0} />
        </TabBtn>
        <TabBtn active={tab === "processed"} onClick={() => setTab("processed")}>
          Đã duyệt
          <Count n={processedCount} />
        </TabBtn>
        {canApprove && (
          <TabBtn active={tab === "toApprove"} onClick={() => setTab("toApprove")}>
            Chờ tôi duyệt
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
