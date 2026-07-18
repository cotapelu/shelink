"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { InvoiceItem } from "./InvoiceBuilder";

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof InvoiceItem, value: string | number) => void;
}

export function InvoiceItemsTable({ items, onAdd, onRemove, onUpdate }: InvoiceItemsTableProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Mặt hàng</h3>
        <Button variant="outline" size="sm" onClick={onAdd}>Thêm hàng</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 text-sm font-medium">Mô tả</th>
              <th className="text-right py-2 text-sm font-medium w-24">Số lượng</th>
              <th className="text-right py-2 text-sm font-medium w-32">Đơn giá</th>
              <th className="text-right py-2 text-sm font-medium w-32">Thành tiền</th>
              <th className="py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="py-2">
                  <Input value={item.description} onChange={e => onUpdate(item.id, "description", e.target.value)} placeholder="Mô tả" />
                </td>
                <td className="py-2">
                  <Input type="number" min={1} value={item.quantity} onChange={e => onUpdate(item.id, "quantity", Number(e.target.value))} className="text-right" />
                </td>
                <td className="py-2">
                  <Input type="number" min={0} step={0.01} value={item.unitPrice} onChange={e => onUpdate(item.id, "unitPrice", Number(e.target.value))} className="text-right" />
                </td>
                <td className="py-2 text-right text-sm text-stone-600">
                  {(item.quantity * item.unitPrice).toFixed(2)}
                </td>
                <td className="py-2 text-center">
                  <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)} disabled={items.length === 1}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
