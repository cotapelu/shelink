"use client";

/**
 * Bảng danh sách quỹ (hiển thị thuần). Mỗi cell tách nhỏ để giữ hàm ≤50 dòng.
 */

import { Wallet, Pencil, Building2, Smartphone, Banknote } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { TYPE_LABEL, type CashAccountRow } from "./types";

const TYPE_ICON = {
  CASH: <Banknote className="h-3.5 w-3.5" />,
  BANK: <Building2 className="h-3.5 w-3.5" />,
  EWALLET: <Smartphone className="h-3.5 w-3.5" />
} as const;

export function CashAccountTable({
  accounts,
  canManage,
  pending,
  onEdit,
  onToggle
}: {
  accounts: CashAccountRow[];
  canManage: boolean;
  pending: boolean;
  onEdit: (row: CashAccountRow) => void;
  onToggle: (row: CashAccountRow, active: boolean) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-5 py-2.5 font-medium">Quỹ</th>
            <th className="px-3 py-2.5 font-medium">Loại</th>
            <th className="px-3 py-2.5 text-right font-medium">Số dư đầu kỳ</th>
            <th className="px-3 py-2.5 text-right font-medium">Số dư hiện tại</th>
            <th className="px-3 py-2.5 text-center font-medium">Trạng thái</th>
            <th className="px-5 py-2.5 text-right font-medium">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {accounts.map((row) => (
            <CashAccountRowView key={row.id} row={row} canManage={canManage} pending={pending} onEdit={onEdit} onToggle={onToggle} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CashAccountRowView({
  row,
  canManage,
  pending,
  onEdit,
  onToggle
}: {
  row: CashAccountRow;
  canManage: boolean;
  pending: boolean;
  onEdit: (row: CashAccountRow) => void;
  onToggle: (row: CashAccountRow, active: boolean) => void;
}) {
  return (
    <tr className="transition-colors hover:bg-popover">
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-3.5 w-3.5 text-primary" />
          <div>
            <div className="font-medium text-foreground">{row.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {row.bankName ? `${row.bankName} ` : ""}
              {row.accountNoMasked ? `••${row.accountNoMasked}` : ""}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          {TYPE_ICON[row.type]}
          {TYPE_LABEL[row.type]}
        </span>
      </td>
      <td className="px-3 py-3 text-right font-mono text-[13px] tabular-nums text-muted-foreground">
        {formatCurrency(Number(row.openingBalance))}
      </td>
      <td className="px-3 py-3 text-right font-mono text-[13px] tabular-nums font-medium text-foreground">
        {formatCurrency(row.balance)}
      </td>
      <td className="px-3 py-3 text-center">
        {row.active ? (
          <Badge variant="secondary" className="text-[10px]">Đang dùng</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">Ngừng</Badge>
        )}
      </td>
      <RowActions row={row} canManage={canManage} pending={pending} onEdit={onEdit} onToggle={onToggle} />
    </tr>
  );
}

function RowActions({
  row,
  canManage,
  pending,
  onEdit,
  onToggle
}: {
  row: CashAccountRow;
  canManage: boolean;
  pending: boolean;
  onEdit: (row: CashAccountRow) => void;
  onToggle: (row: CashAccountRow, active: boolean) => void;
}) {
  if (!canManage) {
    return (
      <td className="px-5 py-3 text-[11px] text-muted-foreground">Chỉ xem</td>
    );
  }
  return (
    <td className="px-5 py-3">
      <div className="flex items-center justify-end gap-2">
        <Switch checked={row.active} disabled={pending} onCheckedChange={(v) => onToggle(row, v)} aria-label="Bật/tắt quỹ" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(row)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    </td>
  );
}
