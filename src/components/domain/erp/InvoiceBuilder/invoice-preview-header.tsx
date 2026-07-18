"use client";

interface InvoicePreviewHeaderProps {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
}

export function InvoicePreviewHeader({ invoiceNumber, invoiceDate, dueDate }: InvoicePreviewHeaderProps) {
  return (
    <div className="flex justify-between items-start mb-8">
      <div>
        <h1 className="text-3xl font-bold text-stone-800">INVOICE</h1>
        <p className="text-stone-500 mt-1">#{invoiceNumber}</p>
      </div>
      <div className="text-right">
        <p className="text-sm text-stone-500">Date: {invoiceDate}</p>
        <p className="text-sm text-stone-500">Due: {dueDate}</p>
      </div>
    </div>
  );
}
