import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isManager } from "@/lib/permissions";
import { listLeaveRequests } from "@/server/leave/actions";
import { LeaveView } from "./_components/leave-view";

/** Trang Nghỉ phép (TD-D2): danh sách + số dư phép + duyệt (server component nạp dữ liệu). */
export default async function LeavePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  const { items, balance } = await listLeaveRequests({});
  return (
    <div className="mx-auto max-w-[1440px] px-8 py-6">
      <LeaveView
        items={items}
        balance={balance}
        canDecide={isManager(session.user.role)}
        currentUserId={session.user.id}
      />
    </div>
  );
}
