"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { decideLeaveRequest, cancelLeaveRequest } from "@/server/leave/actions";
import type { LeaveBalance } from "@/server/leave/balance";
import { LeaveRequestSheet } from "./leave-request-sheet";
import { LeaveBalanceCard } from "./leave-balance-card";
import { LeaveRejectDialog } from "./leave-reject-dialog";
import { LeaveTable, type LeaveRow } from "./leave-table";

type Props = {
  items: LeaveRow[];
  balance: LeaveBalance;
  canDecide: boolean;
  currentUserId: string;
};

type Tab = "mine" | "team" | "all";

function useLeaveMutations() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = useCallback(
    (fn: () => Promise<unknown>) =>
      startTransition(async () => {
        try {
          await fn();
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Thao tác thất bại");
        }
      }),
    [router]
  );
  const approve = useCallback((id: string) => run(() => decideLeaveRequest({ id, approve: true })), [run]);
  const reject = useCallback((id: string, note: string) => run(() => decideLeaveRequest({ id, approve: false, note })), [run]);
  const cancel = useCallback((id: string) => run(() => cancelLeaveRequest({ id })), [run]);
  return { pending, approve, reject, cancel };
}

export function LeaveView({ items, balance, canDecide, currentUserId }: Props) {
  const { pending, approve, reject, cancel } = useLeaveMutations();
  const [tab, setTab] = useState<Tab>("mine");
  const [rejectId, setRejectId] = useState<string | null>(null);

  const tabs = useMemo(() => {
    const base: { key: Tab; label: string }[] = [{ key: "mine", label: "Của tôi" }];
    if (canDecide) base.push({ key: "team", label: "Của đội nhóm" }, { key: "all", label: "Tất cả" });
    return base;
  }, [canDecide]);

  const rows = useMemo(() => {
    if (tab === "mine") return items.filter((i) => i.user.id === currentUserId);
    if (tab === "team") return items.filter((i) => i.user.id !== currentUserId);
    return items;
  }, [items, tab, currentUserId]);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Nghỉ phép</h1>
          <p className="text-[13px] text-muted-foreground">Xin nghỉ phép và duyệt đơn; số dư phép tính theo năm.</p>
        </div>
        <LeaveRequestSheet />
      </header>
      <LeaveBalanceCard balance={balance} />
      <div className="inline-flex gap-1 rounded-lg border border-border bg-card p-0.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={"rounded-md px-2.5 py-1 text-xs transition-colors " + (tab === t.key ? "bg-popover text-foreground" : "text-muted-foreground")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <LeaveTable rows={rows} canDecide={canDecide} currentUserId={currentUserId} pending={pending} onApprove={approve} onReject={(id) => setRejectId(id)} onCancel={cancel} />
      <LeaveRejectDialog open={rejectId !== null} onOpenChange={(o) => !o && setRejectId(null)} onConfirm={(note) => { if (rejectId) reject(rejectId, note); setRejectId(null); }} />
    </div>
  );
}
