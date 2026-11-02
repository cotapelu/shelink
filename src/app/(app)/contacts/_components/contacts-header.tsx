"use client";

import { BookUser } from "lucide-react";

export function ContactsHeader() {
  return (
    <header>
      <h1 className="flex items-center gap-2 text-xl">
        <BookUser className="h-5 w-5 text-primary" strokeWidth={1.8} />
        Danh bạ
      </h1>
      <p className="mt-0.5 text-[12px] text-muted-foreground">Đồng nghiệp trong VP và liên hệ ngoài</p>
    </header>
  );
}
