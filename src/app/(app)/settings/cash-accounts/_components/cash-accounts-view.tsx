"use client";

/**
 * Giao diện Quản lý Quỹ (TD-C1, UI-DESIGN §7.10). Orchestrator: state mở dialog + thao tác
 * bật/tắt; toolbar/empty/bảng/form tách nhỏ để giữ mỗi hàm ≤50 dòng.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setCashAccountActive } from "@/server/cash-accounts/actions";
import { CashAccountTable } from "./cash-account-table";
import { CashAccountDialog } from "./cash-account-dialog";
import type { CashAccountRow } from "./types";

async function runToggleActive(row: CashAccountRow, active: boolean) {
  await setCashAccountActive(row.id, active);
  toast.success(active ? "Đã bật quỹ" : "Đã ngừng dùng quỹ");
}

export function CashAccountsView({ accounts, canManage }: { accounts: CashAccountRow[]; canManage: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CashAccountRow | null>(null);
  const [pending, startTransition] = useTransition();

  function openDialog(row: CashAccountRow | null) {
    setEditing(row);
    setOpen(true);
  }
  function handleSaved() {
    setOpen(false);
    router.refresh();
  }
  function toggleActive(row: CashAccountRow, active: boolean) {
    startTransition(async () => {
      try {
        await runToggleActive(row, active);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Cập nhật thất bại");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Toolbar canManage={canManage} onCreate={() => openDialog(null)} />
      {accounts.length === 0 ? (
        <EmptyState />
      ) : (
        <CashAccountTable accounts={accounts} canManage={canManage} pending={pending} onEdit={openDialog} onToggle={toggleActive} />
      )}
      {open && (
        <CashAccountDialog key={editing?.id ?? "new"} open={open} onOpenChange={setOpen} row={editing} onSaved={handleSaved} />
      )}
    </div>
  );
}

function Toolbar({ canManage, onCreate }: { canManage: boolean; onCreate: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-[13px] text-muted-foreground">
        Quỹ dùng để ghi nhận thu/chi theo tiền mặt, ngân hàng, ví điện tử. Số dư = số dư đầu kỳ + thu − chi.
      </p>
      {canManage && (
        <Button size="sm" className="gap-1.5" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5" />
          Thêm quỹ
        </Button>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <p className="rounded-xl border border-border bg-card py-12 text-center text-xs text-muted-foreground">
      Chưa có quỹ nào. Nhấn “Thêm quỹ” để tạo quỹ đầu tiên.
    </p>
  );
}
