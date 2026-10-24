"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { createQuote } from "@/server/quotes/actions";
import { EMPTY_ROW, QuoteFormFields, type ItemRow } from "./quote-form-fields";

const filledItems = (items: ItemRow[]) =>
  items
    .filter((r) => r.name.trim() && Number(r.unitPrice) > 0)
    .map((r) => ({
      name: r.name,
      quantity: Number(r.quantity) || 1,
      unitPrice: Number(r.unitPrice) || 0,
      unit: r.unit || undefined
    }));

const reset = (s: Setters) => {
  s.setTitle("");
  s.setClientId("");
  s.setItems([{ ...EMPTY_ROW }]);
};

type Setters = {
  setTitle: (v: string) => void;
  setClientId: (v: string) => void;
  setItems: (v: ItemRow[]) => void;
};

/** Sheet tạo báo giá (UI-DESIGN §6.3). */
export function QuoteFormSheet({ clients }: { clients: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [validDays, setValidDays] = useState("30");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [taxPercent, setTaxPercent] = useState("0");
  const [items, setItems] = useState<ItemRow[]>([{ ...EMPTY_ROW }]);
  const setters = { setTitle, setClientId, setItems };

  const fields = { title, setTitle, clientId, setClientId, items, setItems, discountPercent, setDiscountPercent, taxPercent, setTaxPercent, validDays, setValidDays };

  const submit = () =>
    startTransition(async () => {
      try {
        await createQuote({
          title,
          clientId,
          validDays: Number(validDays) || 30,
          discountPercent: Number(discountPercent) || 0,
          taxPercent: Number(taxPercent) || 0,
          items: filledItems(items)
        });
        toast.success("Đã tạo báo giá");
        setOpen(false);
        reset(setters);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Tạo báo giá thất bại");
      }
    });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>Tạo báo giá</Button>
      <SheetContent className="max-w-2xl">
        <SheetHeader><SheetTitle>Báo giá mới</SheetTitle></SheetHeader>
        <div className="px-4 overflow-y-auto">
          <QuoteFormFields clients={clients} {...fields} />
        </div>
        <SheetFooter>
          <Button disabled={pending || !title || !clientId} onClick={submit}>Lưu báo giá</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
