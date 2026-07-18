"use client";

import { BookUser } from "lucide-react";

export function ContactsHeader() {
  return (
    <header>
      <h1 className="flex items-center gap-2 text-xl">
        <BookUser className="h-5 w-5 text-primary" strokeWidth={1.8} />
        通讯录
      </h1>
      <p className="mt-0.5 text-[12px] text-muted-foreground">本所同事与外部联系人</p>
    </header>
  );
}
