"use client";

/**
 * Form chỉnh thuật ngữ hiển thị (TD-G1). Gọi saveTerminologyAction, reload layout để áp nhãn mới.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TermKey } from "@/lib/terminology";
import { saveTerminologyAction } from "@/server/settings/terminology-actions";

type Terms = Record<TermKey, string>;

const KEY_META: { key: TermKey; desc: string }[] = [
  { key: "matter", desc: "Dự án / Vụ / Công việc" },
  { key: "client", desc: "Khách hàng" },
  { key: "contact", desc: "Người liên hệ" },
  { key: "party", desc: "Bên liên quan / Đối tác" },
  { key: "cause", desc: "Danh mục loại việc / dịch vụ" },
  { key: "procedure", desc: "Giai đoạn xử lý" },
  { key: "quote", desc: "Báo giá" },
  { key: "contract", desc: "Hợp đồng" },
  { key: "timesheet", desc: "Ghi giờ" },
  { key: "expense", desc: "Chi phí" },
  { key: "intake", desc: "Tiếp nhận / Lead" },
  { key: "seal", desc: "Phê duyệt" },
  { key: "archive", desc: "Lưu trữ" }
];

export function TerminologyForm({ initial }: { initial: Terms }) {
  const router = useRouter();
  const [terms, setTerms] = useState<Terms>(initial);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        await saveTerminologyAction(terms);
        toast.success("Đã lưu thuật ngữ");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Lưu thất bại");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {KEY_META.map(({ key, desc }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{desc}</Label>
              <Input
                value={terms[key] ?? ""}
                maxLength={40}
                onChange={(e) => setTerms({ ...terms, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <Button size="sm" onClick={submit} disabled={pending}>
            {pending ? "Đang lưu…" : "Lưu thuật ngữ"}
          </Button>
        </div>
      </div>
      <p className="text-[12px] text-muted-foreground">
        Thuật ngữ chỉ đổi nhãn hiển thị ở lớp UI (PRD quyết định #22); model dữ liệu giữ nguyên.
        Để trống một mục sẽ quay về nhãn mặc định.
      </p>
    </div>
  );
}
