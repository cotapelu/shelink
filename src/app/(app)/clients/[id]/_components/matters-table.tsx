"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
            <TableHead>案件编号</TableHead>
            <TableHead>案由</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>签约合同</TableHead>
            <TableHead>金额</TableHead>
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
                  ¥{Number(b.contractAmount).toLocaleString()}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
