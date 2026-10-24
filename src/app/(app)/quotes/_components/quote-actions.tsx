"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  setQuoteStatus,
  convertQuoteToContract,
  convertQuoteToMatter
} from "@/server/quotes/actions";

type Action = "SENT" | "ACCEPTED" | "REJECTED" | "CANCELLED";

/** Các nút thao tác theo trạng thái báo giá (PRD §10.4). */
export function QuoteActions({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

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

  const statusBtn = (action: Action, label: string, variant: "default" | "outline" = "default") => (
    <Button key={action} size="sm" variant={variant} disabled={pending} onClick={() => run(() => setQuoteStatus(id, action), "Đã cập nhật")}>
      {label}
    </Button>
  );

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {status === "DRAFT" && statusBtn("SENT", "Gửi báo giá")}
      {status === "SENT" && (
        <>
          {statusBtn("ACCEPTED", "Đánh dấu đạt")}
          {statusBtn("REJECTED", "Từ chối", "outline")}
          {convertBtn(id, () => run(() => convertQuoteToContract({ id }), "Đã tạo hợp đồng"), "Tạo hợp đồng", pending)}
          {convertBtn(id, () => run(() => convertQuoteToMatter({ id }), "Đã tạo dự án"), "Tạo dự án", pending, true)}
        </>
      )}
      {status === "ACCEPTED" && (
        <>
          {convertBtn(id, () => run(() => convertQuoteToContract({ id }), "Đã tạo hợp đồng"), "Tạo hợp đồng", pending)}
          {convertBtn(id, () => run(() => convertQuoteToMatter({ id }), "Đã tạo dự án"), "Tạo dự án", pending, true)}
        </>
      )}
      {(status === "DRAFT" || status === "SENT") && statusBtn("CANCELLED", "Huỷ", "outline")}
    </div>
  );
}

function convertBtn(id: string, onClick: () => void, label: string, pending: boolean, outline = false) {
  return (
    <Button key={`${id}-${label}`} size="sm" variant={outline ? "outline" : "default"} disabled={pending} onClick={onClick}>
      {label}
    </Button>
  );
}
