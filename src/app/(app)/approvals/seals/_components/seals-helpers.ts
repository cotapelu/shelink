import type { Tab } from "./seals-view";

export function emptySealsText(tab: Tab, firmTabLabel: string): string {
  if (tab === "pending") return "暂无待审批申请";
  if (tab === "processed") return "暂无已审批申请";
  if (tab === "toApprove") return "暂无待你审批的申请";
  if (tab === "firm") return `暂无${firmTabLabel}记录`;
  return "你还没有用章申请";
}
