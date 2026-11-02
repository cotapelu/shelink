"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Contact } from "@prisma/client";


function renderEmpty() {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-base font-semibold">Người liên hệ</h2>
      <p className="text-sm text-muted-foreground">Chưa có người liên hệ</p>
    </section>
  );
}

function renderTable({ contacts }: { contacts: Contact[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Họ tên</TableHead>
            <TableHead>Chức danh</TableHead>
            <TableHead>Điện thoại</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Zalo/chat</TableHead>
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
  );
}

export function ContactsSection({ contacts }: { contacts: Contact[] }) {
  if (contacts.length === 0) {
    return renderEmpty();
  }
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-base font-semibold">Người liên hệ</h2>
      {renderTable({ contacts })}
    </section>
  );
}
