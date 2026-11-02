import type { Tab } from "./seals-view";

export function emptySealsText(tab: Tab, firmTabLabel: string): string {
  if (tab === "pending") return "Chưa có yêu cầu chờ duyệt";
  if (tab === "processed") return "Chưa có yêu cầu đã duyệt";
  if (tab === "toApprove") return "Chưa có yêu cầu nào chờ bạn duyệt";
  if (tab === "firm") return `Chưa có bản ghi ${firmTabLabel}`;
  return "Bạn chưa có yêu cầu dùng dấu nào";
}
