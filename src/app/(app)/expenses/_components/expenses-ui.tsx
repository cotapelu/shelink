"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { createExpense, submitExpense, approveExpense, rejectExpense, payExpense } from "@/server/expenses/actions";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  SUBMITTED: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  PAID: "Đã chi",
  CANCELLED: "Đã huỷ"
};

const CATEGORY_LABELS: Record<string, string> = {
  TRAVEL: "Đi lại",
  HOSPITALITY: "Tiếp khách",
  OFFICE: "Văn phòng",
  OUTSOURCING: "Thuê ngoài",
  EQUIPMENT: "Thiết bị",
  TAX_FEE: "Thuế phí",
  OTHER: "Khác"
};

export const fmtMoney = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 0 });

export function ExpenseStatusBadge({ status }: { status: string }) {
  return <Badge className="bg-muted">{STATUS_LABELS[status] ?? status}</Badge>;
}

export interface ExpenseRow {
  id: string;
  code: string;
  title: string;
  category: string;
  amount: number;
  status: string;
  occurredAt: Date;
  claimantName: string | null;
  matterLabel: string | null;
}

/** Bảng phiếu chi + thao tác theo trạng thái (UI-DESIGN §7.10). */
export function ExpensesTable({ rows, canApprove }: { rows: ExpenseRow[]; canApprove: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>, success: string) =>
    startTransition(async () => {
      try {
        await fn();
        toast.success(success);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Thao tác thất bại");
      }
    });

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left">Mã</th><th className="px-4 py-2 text-left">Nội dung</th>
            <th className="px-4 py-2 text-left">Loại</th><th className="px-4 py-2 text-left">Người đề nghị</th>
            <th className="px-4 py-2 text-left">Dự án</th><th className="px-4 py-2 text-left">Trạng thái</th>
            <th className="px-4 py-2 text-right">Số tiền</th><th className="px-4 py-2 text-left">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-4 py-2 font-mono text-xs">{r.code}</td>
              <td className="px-4 py-2">{r.title}</td>
              <td className="px-4 py-2 text-muted-foreground">{CATEGORY_LABELS[r.category] ?? r.category}</td>
              <td className="px-4 py-2">{r.claimantName ?? "—"}</td>
              <td className="px-4 py-2">{r.matterLabel ?? "—"}</td>
              <td className="px-4 py-2"><ExpenseStatusBadge status={r.status} /></td>
              <td className="px-4 py-2 text-right font-mono tabular-nums">{fmtMoney(r.amount)}</td>
              <td className="px-4 py-2">
                <ExpenseRowActions row={r} canApprove={canApprove} pending={pending} run={run} />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">Chưa có phiếu chi.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Sheet tạo phiếu chi (UI-DESIGN §6.3). */
export function ExpenseFormSheet({ matters }: { matters: { id: string; label: string }[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("OFFICE");
  const [matterId, setMatterId] = useState("");

  const submit = () =>
    startTransition(async () => {
      try {
        await createExpense({
          title,
          amount: Number(amount),
          occurredAt: new Date(occurredAt),
          category: category as never,
          matterId: matterId || undefined
        });
        toast.success("Đã tạo phiếu chi");
        setOpen(false);
        setTitle("");
        setAmount("");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Tạo phiếu chi thất bại");
      }
    });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>Tạo phiếu chi</Button>
      <SheetContent className="max-w-md">
        <SheetHeader><SheetTitle>Phiếu chi mới</SheetTitle></SheetHeader>
        <ExpenseFormFields
          title={title} setTitle={setTitle}
          amount={amount} setAmount={setAmount}
          occurredAt={occurredAt} setOccurredAt={setOccurredAt}
          category={category} setCategory={setCategory}
          matterId={matterId} setMatterId={setMatterId}
          matters={matters}
        />
        <SheetFooter>
          <Button disabled={pending || !title || !amount} onClick={submit}>Lưu</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ExpenseFormFields({
  title, setTitle, amount, setAmount, occurredAt, setOccurredAt, category, setCategory, matterId, setMatterId, matters
}: {
  title: string; setTitle: (v: string) => void;
  amount: string; setAmount: (v: string) => void;
  occurredAt: string; setOccurredAt: (v: string) => void;
  category: string; setCategory: (v: string) => void;
  matterId: string; setMatterId: (v: string) => void;
  matters: { id: string; label: string }[];
}) {
  return (
    <div className="space-y-3 px-4">
      <div><Label>Nội dung</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Số tiền</Label><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div><Label>Ngày chi</Label><Input type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} /></div>
      </div>
      <ExpenseSelect label="Loại" value={category} onChange={setCategory} options={Object.entries(CATEGORY_LABELS)} />
      <ExpenseSelect
        label="Dự án (tuỳ chọn)"
        value={matterId}
        onChange={setMatterId}
        options={[["", "— không gắn —"] as [string, string], ...matters.map((m): [string, string] => [m.id, m.label])]}
      />
    </div>
  );
}

function ExpenseSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div><Label>{label}</Label>
      <select className="w-full rounded-md border bg-transparent h-9 px-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  );
}

function ExpenseRowActions({
  row, canApprove, pending, run
}: {
  row: ExpenseRow;
  canApprove: boolean;
  pending: boolean;
  run: (fn: () => Promise<unknown>, success: string) => void;
}) {
  return (
    <div className="flex gap-1">
      {row.status === "DRAFT" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => submitExpense(row.id), "Đã gửi duyệt")}>Gửi duyệt</Button>
      )}
      {canApprove && row.status === "SUBMITTED" && (
        <>
          <Button size="sm" disabled={pending} onClick={() => run(() => approveExpense(row.id), "Đã duyệt")}>Duyệt</Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => {
            const reason = prompt("Lý do từ chối:");
            if (reason) run(() => rejectExpense({ id: row.id, reason }), "Đã từ chối");
          }}>Từ chối</Button>
        </>
      )}
      {canApprove && row.status === "APPROVED" && (
        <Button size="sm" disabled={pending} onClick={() => run(() => payExpense({ id: row.id }), "Đã chi")}>Chi tiền</Button>
      )}
    </div>
  );
}
