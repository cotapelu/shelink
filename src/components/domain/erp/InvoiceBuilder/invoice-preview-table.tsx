"use client";

import { InvoiceItem } from "./InvoiceBuilder";

interface InvoicePreviewTableProps {
  items: InvoiceItem[];
  formatCurrency: (amount: number) => string;
}

export function InvoicePreviewTable({ items, formatCurrency }: InvoicePreviewTableProps) {
  return (
    <table className="w-full mb-8">
      <thead>
        <tr className="border-b-2 border-stone-200">
          <th className="text-left py-3 text-sm font-semibold text-stone-600">Description</th>
          <th className="text-right py-3 text-sm font-semibold text-stone-600 w-24">Qty</th>
          <th className="text-right py-3 text-sm font-semibold text-stone-600 w-32">Unit Price</th>
          <th className="text-right py-3 text-sm font-semibold text-stone-600 w-32">Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-stone-100">
            <td className="py-3 text-stone-800">{item.description}</td>
            <td className="py-3 text-right text-stone-600">{item.quantity}</td>
            <td className="py-3 text-right text-stone-600">{formatCurrency(item.unitPrice)}</td>
            <td className="py-3 text-right text-stone-800 font-medium">{formatCurrency(item.quantity * item.unitPrice)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
