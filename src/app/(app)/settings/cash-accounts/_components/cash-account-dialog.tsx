"use client";

/**
 * Dialog tạo/sửa quỹ. Tự quản lý state form; remount qua key khi mở để reset.
 * Form fields tách riêng để giữ hàm ≤50 dòng.
 */

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cashAccountCreateSchema } from "@/server/cash-accounts/schemas";
import { createCashAccount, updateCashAccount } from "@/server/cash-accounts/actions";
import type { CashAccountRow, CashAccountType } from "./types";

type FormState = {
  name: string;
  type: CashAccountType;
  currency: string;
  openingBalance: string;
  bankName: string;
  accountNoMasked: string;
  note: string;
};

const EMPTY: FormState = {
  name: "",
  type: "BANK",
  currency: "VND",
  openingBalance: "0",
  bankName: "",
  accountNoMasked: "",
  note: ""
};

function toForm(row: CashAccountRow): FormState {
  return {
    name: row.name,
    type: row.type,
    currency: row.currency,
    openingBalance: String(Number(row.openingBalance)),
    bankName: row.bankName ?? "",
    accountNoMasked: row.accountNoMasked ?? "",
    note: row.note ?? ""
  };
}

/** Validate + ghi; ném lỗi để submit hiển thị toast. Trả về thông báo thành công. */
async function persistAccount(form: FormState, row: CashAccountRow | null): Promise<string> {
  const parsed = cashAccountCreateSchema.safeParse({
    ...form,
    openingBalance: Number(form.openingBalance),
    bankName: form.bankName || undefined,
    accountNoMasked: form.accountNoMasked || undefined,
    note: form.note || undefined
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
  if (row) {
    await updateCashAccount({ ...parsed.data, id: row.id, active: row.active });
    return "Đã cập nhật quỹ";
  }
  await createCashAccount(parsed.data);
  return "Đã tạo quỹ";
}

export function CashAccountDialog({
  open,
  onOpenChange,
  row,
  onSaved
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: CashAccountRow | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(row ? toForm(row) : EMPTY);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        toast.success(await persistAccount(form, row));
        onSaved();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Lưu thất bại");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{row ? "Sửa quỹ" : "Thêm quỹ"}</DialogTitle>
        </DialogHeader>
        <AccountFormFields form={form} setForm={setForm} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={submit} disabled={pending}>{row ? "Lưu thay đổi" : "Tạo quỹ"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccountFormFields({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Tên quỹ">
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Tiền mặt VP, Techcombank" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Loại quỹ">
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as CashAccountType })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">Tiền mặt</SelectItem>
              <SelectItem value="BANK">Ngân hàng</SelectItem>
              <SelectItem value="EWALLET">Ví điện tử</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tiền tệ">
          <Input value={form.currency} maxLength={8} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ngân hàng / đơn vị">
          <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
        </Field>
        <Field label="Số tài khoản (4 số cuối)">
          <Input value={form.accountNoMasked} maxLength={32} onChange={(e) => setForm({ ...form, accountNoMasked: e.target.value })} placeholder="••1234" />
        </Field>
      </div>
      <Field label="Số dư đầu kỳ">
        <Input type="number" min={0} value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} />
      </Field>
      <Field label="Ghi chú">
        <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
