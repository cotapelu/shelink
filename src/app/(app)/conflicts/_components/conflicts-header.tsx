"use client";

import { ShieldCheck } from "lucide-react";

export function ConflictsHeader() {
  return (
    <header>
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <ShieldCheck className="h-5 w-5 text-primary" />
        Kiểm tra xung đột lợi ích
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tra nhanh — đối chiếu khách và vụ án lịch sử, xác nhận có xung đột đại diện không
      </p>
    </header>
  );
}
