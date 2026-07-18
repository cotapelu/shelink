"use client";

import { Card } from "@/components/ui/card";
import { InvoiceData } from "./InvoiceBuilder";
import { InvoicePreviewHeader } from "./invoice-preview-header";
import { InvoiceParties } from "./invoice-parties";
import { InvoicePreviewTable } from "./invoice-preview-table";
import { InvoicePreviewSummary } from "./invoice-preview-summary";
import { InvoicePreviewNotes } from "./invoice-preview-notes";

interface InvoicePreviewProps {
  data: InvoiceData;
  formatCurrency: (amount: number) => string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

export function InvoicePreview({ data, formatCurrency, subtotal, tax, discount, total }: InvoicePreviewProps) {
  return (
    <Card className="max-w-4xl mx-auto p-8 bg-white my-6">
      <InvoicePreviewHeader invoiceNumber={data.invoiceNumber} invoiceDate={data.invoiceDate} dueDate={data.dueDate} />
      <InvoiceParties from={data.from} to={data.to} />
      <InvoicePreviewTable items={data.items} formatCurrency={formatCurrency} />
      <InvoicePreviewSummary formatCurrency={formatCurrency} subtotal={subtotal} tax={tax} discount={discount} total={total} taxRate={data.taxRate} />
      <InvoicePreviewNotes notes={data.notes} />
    </Card>
  );
}
