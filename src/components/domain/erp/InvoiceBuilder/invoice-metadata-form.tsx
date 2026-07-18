"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface InvoiceMetadata {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  taxRate: number;
  discount: number;
  notes?: string;
}

interface InvoiceMetadataFormProps {
  value: InvoiceMetadata;
  onChange: (v: InvoiceMetadata) => void;
}

export function InvoiceMetadataForm({ value, onChange }: InvoiceMetadataFormProps) {
  const update = (field: keyof InvoiceMetadata, val: string | number) => onChange({ ...value, [field]: val });

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Thông tin hóa đơn</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label>Số hóa đơn</Label>
          <Input value={value.invoiceNumber} onChange={e => update("invoiceNumber", e.target.value)} />
        </div>
        <div>
          <Label>Ngày lập</Label>
          <Input type="date" value={value.invoiceDate} onChange={e => update("invoiceDate", e.target.value)} />
        </div>
        <div>
          <Label>Ngày đến hạn</Label>
          <Input type="date" value={value.dueDate} onChange={e => update("dueDate", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Thuế (%)</Label>
          <Input type="number" min={0} max={100} value={value.taxRate || 0} onChange={e => update("taxRate", Number(e.target.value))} />
        </div>
        <div>
          <Label>Giảm giá</Label>
          <Input type="number" min={0} value={value.discount || 0} onChange={e => update("discount", Number(e.target.value))} />
        </div>
      </div>
      <div>
        <Label>Ghi chú</Label>
        <Textarea value={value.notes || ""} onChange={e => update("notes", e.target.value)} placeholder="Ghi chú thêm" />
      </div>
    </div>
  );
}
