"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeQuotePricing } from "@/server/quotes/pricing";

export interface ItemRow {
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

export const EMPTY_ROW: ItemRow = { name: "", quantity: "1", unit: "", unitPrice: "" };

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 0 });

export interface QuoteFormValue {
  title: string;
  setTitle: (v: string) => void;
  clientId: string;
  setClientId: (v: string) => void;
  items: ItemRow[];
  setItems: (v: ItemRow[]) => void;
  discountPercent: string;
  setDiscountPercent: (v: string) => void;
  taxPercent: string;
  setTaxPercent: (v: string) => void;
  validDays: string;
  setValidDays: (v: string) => void;
}

/** Các trường nhập báo giá + tính tiền realtime (DATA-MODEL §4.28). */
export function QuoteFormFields({
  title, setTitle, clientId, setClientId, clients,
  items, setItems, discountPercent, setDiscountPercent, taxPercent, setTaxPercent, validDays, setValidDays
}: QuoteFormValue & { clients: { id: string; name: string }[] }) {
  const filled = items.filter((r) => r.name.trim() && Number(r.unitPrice) > 0);
  const pricing = computeQuotePricing({
    items: filled.map((r) => ({ quantity: Number(r.quantity) || 0, unitPrice: Number(r.unitPrice) || 0 })),
    discountPercent: Number(discountPercent) || 0,
    taxPercent: Number(taxPercent) || 0
  });

  return (
    <div className="space-y-4">
      <QuoteIdentityFields
        title={title} setTitle={setTitle}
        clientId={clientId} setClientId={setClientId} clients={clients}
      />
      <QuoteItemsEditor items={items} setItems={setItems} />
      <QuoteTermsFields
        discountPercent={discountPercent} setDiscountPercent={setDiscountPercent}
        taxPercent={taxPercent} setTaxPercent={setTaxPercent}
        validDays={validDays} setValidDays={setValidDays}
      />
      <QuoteTotalsPreview pricing={pricing} />
    </div>
  );
}

function QuoteIdentityFields({ title, setTitle, clientId, setClientId, clients }: {
  title: string; setTitle: (v: string) => void; clientId: string; setClientId: (v: string) => void; clients: { id: string; name: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div><Label>Tiêu đề</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div>
        <Label>Khách hàng</Label>
        <select className="w-full rounded-md border bg-transparent h-9 px-2 text-sm" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">— chọn —</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
    </div>
  );
}

function QuoteItemsEditor({ items, setItems }: { items: ItemRow[]; setItems: (v: ItemRow[]) => void }) {
  const patch = (i: number, part: Partial<ItemRow>) =>
    setItems(items.map((r, j) => (j === i ? { ...r, ...part } : r)));

  return (
    <div className="space-y-2">
      <Label>Hạng mục</Label>
      {items.map((row, i) => (
        <div key={i} className="grid grid-cols-[2fr_60px_1fr_auto] gap-2">
          <Input placeholder="Tên hạng mục" value={row.name} onChange={(e) => patch(i, { name: e.target.value })} />
          <Input placeholder="SL" value={row.quantity} onChange={(e) => patch(i, { quantity: e.target.value })} />
          <Input placeholder="Đơn giá" value={row.unitPrice} onChange={(e) => patch(i, { unitPrice: e.target.value })} />
          <Button type="button" size="sm" variant="outline" onClick={() => setItems(items.filter((_, j) => j !== i))}>Xoá</Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => setItems([...items, { ...EMPTY_ROW }])}>+ Thêm dòng</Button>
    </div>
  );
}

function QuoteTermsFields({ discountPercent, setDiscountPercent, taxPercent, setTaxPercent, validDays, setValidDays }: {
  discountPercent: string; setDiscountPercent: (v: string) => void;
  taxPercent: string; setTaxPercent: (v: string) => void;
  validDays: string; setValidDays: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div><Label>Chiết khấu %</Label><Input value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} /></div>
      <div><Label>Thuế %</Label><Input value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} /></div>
      <div><Label>Hiệu lực (ngày)</Label><Input value={validDays} onChange={(e) => setValidDays(e.target.value)} /></div>
    </div>
  );
}

function QuoteTotalsPreview({ pricing }: { pricing: { subtotal: number; discountPercent: number; taxPercent: number; taxAmount: number; total: number } }) {
  return (
    <div className="rounded-lg border border-border p-3 text-sm space-y-1">
      <TotalRow label="Tạm tính" value={pricing.subtotal} />
      <TotalRow label={`Chiết khấu ${pricing.discountPercent}%`} value={(pricing.subtotal * pricing.discountPercent) / 100} />
      <TotalRow label={`Thuế ${pricing.taxPercent}%`} value={pricing.taxAmount} />
      <div className="flex justify-between font-medium border-t border-border pt-1">
        <span>Tổng</span>
        <span className="font-mono tabular-nums">{fmt(pricing.total)}</span>
      </div>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-mono tabular-nums">{fmt(value)}</span>
    </div>
  );
}
