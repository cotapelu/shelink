"use client";

import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";

interface ClientSheetFooterProps {
  isEdit: boolean;
  isPending: boolean;
  onCancel: () => void;
}

export function ClientSheetFooter({ isEdit, isPending, onCancel }: ClientSheetFooterProps) {
  return (
    <SheetFooter className="flex flex-row justify-end gap-2 sm:justify-end">
      <Button variant="outline" onClick={onCancel} disabled={isPending}>
        Hủy
      </Button>
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEdit ? "Lưu thay đổi" : "Tạo khách hàng"}
 </Button>
    </SheetFooter>
  );
}
