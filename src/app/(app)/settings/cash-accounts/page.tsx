/*
 * Trang Quản lý Quỹ (TD-C1, DATA-MODEL §4.31).
 * Xem: quản lý (ADMIN/PRINCIPAL_LAWYER) + FINANCE. Sửa/tạo: chỉ quản lý.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isManager } from "@/lib/permissions";
import { listCashAccountsWithBalance } from "@/server/cash-accounts/actions";
import { CashAccountsView } from "./_components/cash-accounts-view";

export default async function CashAccountsSettingsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  const canViewFinance = isManager(role) || role === "FINANCE";
  if (!canViewFinance) redirect("/settings/profile");

  const accounts = await listCashAccountsWithBalance();

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold">Quản lý quỹ</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Các tài khoản quỹ (tiền mặt / ngân hàng / ví điện tử) dùng để ghi nhận thu chi và cân quỹ.
          Số dư được tính tự động từ số dư đầu kỳ cộng thu trừ chi.
        </p>
      </header>
      <CashAccountsView accounts={accounts} canManage={isManager(role)} />
    </div>
  );
}
