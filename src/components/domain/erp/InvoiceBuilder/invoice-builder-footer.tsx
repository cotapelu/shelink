"use client";

import { Button } from "@/components/ui/button";

interface InvoiceBuilderFooterProps {
  onSave?: () => void;
  onExport?: (format: 'pdf' | 'print') => void;
  disabled?: boolean;
}

export function InvoiceBuilderFooter({ onSave, onExport, disabled }: InvoiceBuilderFooterProps) {
  return (
    <div className="flex justify-end gap-3 mt-6">
      {onExport && (
        <>
          <Button variant="outline" onClick={() => onExport('pdf')} disabled={disabled}>Xuất PDF</Button>
          <Button variant="outline" onClick={() => onExport('print')} disabled={disabled}>In</Button>
        </>
      )}
      {onSave && <Button onClick={onSave} disabled={disabled}>Lưu hóa đơn</Button>}
    </div>
  );
}
