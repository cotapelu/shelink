"use client";

interface InvoicePreviewSummaryProps {
  formatCurrency: (amount: number) => string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  taxRate?: number;
}

export function InvoicePreviewSummary({ formatCurrency, subtotal, tax, discount, total, taxRate }: InvoicePreviewSummaryProps) {
  return (
    <div className="flex justify-end">
      <div className="w-64 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-stone-500">Subtotal</span>
          <span className="text-stone-800">{formatCurrency(subtotal)}</span>
        </div>
        {taxRate && taxRate > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Tax ({taxRate}%)</span>
            <span className="text-stone-800">{formatCurrency(tax)}</span>
          </div>
        )}
        {discount && discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Discount</span>
            <span className="text-green-600">-{formatCurrency(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold border-t-2 border-stone-200 pt-2">
          <span className="text-stone-800">Total</span>
          <span className="text-amber-600">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
