"use client";

interface InvoicePreviewNotesProps {
  notes?: string;
}

export function InvoicePreviewNotes({ notes }: InvoicePreviewNotesProps) {
  if (!notes) return null;
  return (
    <div className="mt-8 pt-8 border-t border-stone-200">
      <h3 className="text-sm font-semibold text-stone-500 uppercase mb-2">Notes</h3>
      <p className="text-stone-600 text-sm">{notes}</p>
    </div>
  );
}
