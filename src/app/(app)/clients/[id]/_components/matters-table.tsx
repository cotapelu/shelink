"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Matter, Billing } from "@prisma/client";

interface MattersTableProps {
  matters: Matter[];
  billingsMap: Map<string, Billing[]>;
}

export function MattersTable({ matters, billingsMap }: MattersTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã vụ án</TableHead>
            <TableHead>Nguyên nhân</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Hợp đồng đã ký</TableHead>
            <TableHead>Số tiền</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matters.flatMap((m) =>
            (billingsMap.get(m.id) ?? []).map((b) => (
              <TableRow key={`${m.id}-${b.id}`}>
                <TableCell className="font-mono text-xs">{m.internalCode}</TableCell>
                <TableCell className="max-w-[200px] truncate">{m.title}</TableCell>
                <TableCell>
                  <Badge variant="outline">{m.status}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{b.title}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(Number(b.contractAmount))}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
