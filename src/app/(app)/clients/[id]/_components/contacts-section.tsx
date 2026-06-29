"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Contact } from "@prisma/client";

export function ContactsSection({ contacts }: { contacts: Contact[] }) {
  if (contacts.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-base font-semibold">联系人</h2>
        <p className="text-sm text-muted-foreground">暂无联系人</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-base font-semibold">联系人</h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>姓名</TableHead>
              <TableHead>职务</TableHead>
              <TableHead>电话</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>微信</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.title ?? "—"}</TableCell>
                <TableCell>{c.phone ?? "—"}</TableCell>
                <TableCell>{c.email ?? "—"}</TableCell>
                <TableCell>{c.wechat ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
