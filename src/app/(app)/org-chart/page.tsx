import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listOrgChart } from "@/server/teams/actions";
import { OrgChartView } from "./_components/org-chart-view";

/** Trang Sơ đồ tổ chức (TD-D4): cơ cấu team + thành viên, chỉ đọc. */
export default async function OrgChartPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  const chart = await listOrgChart();
  return (
    <div className="mx-auto max-w-[1440px] px-8 py-6">
      <OrgChartView chart={chart} />
    </div>
  );
}
