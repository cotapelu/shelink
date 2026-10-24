"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { transitionContract, terminateContract, renewContract } from "@/server/contracts/actions";

/** Các nút chuyển trạng thái hợp đồng theo vòng đời (DATA-MODEL §4.29). */
export function ContractActions({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [renewOpen, setRenewOpen] = useState(false);

  const run = (fn: () => Promise<unknown>, success: string) =>
    startTransition(async () => {
      try {
        await fn();
        toast.success(success);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Thao tác thất bại");
      }
    });

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {status === "DRAFT" && (
        <Button size="sm" disabled={pending} onClick={() => run(() => transitionContract(id, "REVIEW"), "Đã chuyển review")}>
          Chuyển review
        </Button>
      )}
      {status === "REVIEW" && (
        <Button size="sm" disabled={pending} onClick={() => run(() => transitionContract(id, "SIGNED"), "Đã ký")}>
          Đánh dấu đã ký
        </Button>
      )}
      {(status === "SIGNED" || status === "RENEWED") && (
        <>
          <Button size="sm" disabled={pending} onClick={() => run(() => transitionContract(id, "ACTIVE"), "Đã kích hoạt")}>
            Kích hoạt
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setRenewOpen(true)}>Gia hạn</Button>
        </>
      )}
      {(status === "ACTIVE" || status === "RENEWED") && (
        <>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setRenewOpen(true)}>Gia hạn</Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => terminateContract(id, "Chấm dứt từ chi tiết"), "Đã chấm dứt")}>
            Chấm dứt
          </Button>
        </>
      )}
      <RenewSheet open={renewOpen} onOpenChange={setRenewOpen} id={id} />
    </div>
  );
}

function RenewSheet({ open, onOpenChange, id }: { open: boolean; onOpenChange: (v: boolean) => void; id: string }) {
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");

  const submit = () =>
    (async () => {
      try {
        await renewContract({ id, expiresAt: new Date(expiresAt), note: note || undefined });
        toast.success("Đã gia hạn");
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gia hạn thất bại");
      }
    })();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-md">
        <SheetHeader><SheetTitle>Gia hạn hợp đồng</SheetTitle></SheetHeader>
        <div className="space-y-3 px-4">
          <div><Label>Hạn mới</Label><Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></div>
          <div><Label>Lý do / ghi chú</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
        <SheetFooter>
          <Button disabled={!expiresAt} onClick={submit}>Lưu gia hạn</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
