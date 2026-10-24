/*
 * Trang Thuật ngữ hiển thị (TD-G1, DATA-MODEL §4.32).
 * Chỉ quản lý (ADMIN/PRINCIPAL_LAWYER) chỉnh được.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isManager } from "@/lib/permissions";
import { readTerms } from "@/server/settings/terminology";
import { TerminologyForm } from "./_components/terminology-form";

export default async function TerminologySettingsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!isManager(session.user.role)) redirect("/settings/profile");

  const terms = await readTerms();

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold">Thuật ngữ hiển thị</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Đổi nhãn giao diện cho phù hợp ngành (VD: Dự án → Đơn hàng, Khách hàng → Chủ đầu tư).
        </p>
      </header>
      <TerminologyForm initial={terms} />
    </div>
  );
}
