"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LEAVE_STATUS_LABEL, LEAVE_STATUS_CLASS, LEAVE_TYPE_LABEL, fmtLeaveDate } from "./leave-labels";

export type LeaveRow = {
  id: string;
  leaveType: string;
  startDate: Date | string;
  endDate: Date | string;
  days: number;
  reason: string | null;
  status: string;
  approverId: string | null;
  decisionNote: string | null;
  decidedAt: Date | string | null;
  user: { id: string; name: string };
};

type RowProps = {
  row: LeaveRow;
  canDecide: boolean;
  currentUserId: string;
  pending: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
};

function ActionCell({ row, canDecide, currentUserId, pending, onApprove, onReject, onCancel }: RowProps) {
  if (canDecide && row.status === "SUBMITTED") {
    return (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-300" disabled={pending} onClick={() => onApprove(row.id)}>
          Duyệt
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-red-300" disabled={pending} onClick={() => onReject(row.id)}>
          Từ chối
        </Button>
      </div>
    );
  }
  const mine = row.user.id === currentUserId && (row.status === "SUBMITTED" || row.status === "DRAFT");
  if (mine) {
    return (
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" className="h-7 px-2" disabled={pending} onClick={() => onCancel(row.id)}>
          Rút
        </Button>
      </div>
    );
  }
  return <span className="text-[11px] text-muted-foreground">{row.decisionNote ?? ""}</span>;
}

function LeaveRowComp(props: RowProps) {
  const { row } = props;
  return (
    <tr>
      <td className="px-4 py-2.5 text-[13px] text-foreground">{row.user.name}</td>
      <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{LEAVE_TYPE_LABEL[row.leaveType] ?? row.leaveType}</td>
      <td className="px-4 py-2.5 text-[12px] text-muted-foreground">
        {fmtLeaveDate(row.startDate)} — {fmtLeaveDate(row.endDate)}
      </td>
      <td className="px-4 py-2.5 text-right font-mono tabular-nums">{row.days}</td>
      <td className="px-4 py-2.5">
        <Badge className={LEAVE_STATUS_CLASS[row.status] ?? "bg-muted"}>{LEAVE_STATUS_LABEL[row.status] ?? row.status}</Badge>
      </td>
      <td className="px-4 py-2.5 text-right">
        <ActionCell {...props} />
      </td>
    </tr>
  );
}

const HEADERS = ["Người xin", "Loại", "Từ — Đến", "Số ngày", "Trạng thái", ""];

export function LeaveTable(props: Omit<RowProps, "row"> & { rows: LeaveRow[] }) {
  const { rows, ...rest } = props;
  if (rows.length === 0) {
    return <p className="rounded-xl border border-border bg-card py-12 text-center text-xs text-muted-foreground">Không có đơn nghỉ phép.</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            {HEADERS.map((c, i) => (
              <th key={c || i} className={`px-4 py-2.5 font-medium ${i >= 3 ? "text-right" : ""}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <LeaveRowComp key={row.id} row={row} {...rest} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
