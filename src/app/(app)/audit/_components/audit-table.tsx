"use client";

import { Button } from "@/components/ui/button";
import { AuditTableRow } from "./audit-table-row";
import type { AuditListResult } from "@/server/audit-list";

interface AuditTableProps {
  result: AuditListResult;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onNextPage: () => void;
}

export function AuditTable({ result, expanded, onToggleExpand, onNextPage }: AuditTableProps) {
  return (
    <>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 text-muted-foreground">
            <tr>
              <th className="w-8 px-2 py-1.5"></th>
              <th className="w-40 px-2 py-1.5 text-left font-normal">Thời gian</th>
              <th className="w-20 px-2 py-1.5 text-left font-normal">Người thao tác</th>
              <th className="px-2 py-1.5 text-left font-normal">Hành động</th>
              <th className="w-32 px-2 py-1.5 text-left font-normal">Loại đối tượng</th>
              <th className="w-40 px-2 py-1.5 text-left font-normal">ID đối tượng</th>
              <th className="w-24 px-2 py-1.5 text-left font-normal">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-10 text-center text-muted-foreground">
                  Không có bản ghi audit nào khớp
                </td>
              </tr>
            ) : (
              result.items.flatMap((entry) =>
                AuditTableRow({
                  entry,
                  expanded,
                  onToggleExpand
                })
              )
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
        <span>Trang này {result.items.length} mục</span>
        {result.nextCursor && (
          <Button size="sm" variant="outline" onClick={onNextPage}>
            Trang sau →
          </Button>
        )}
      </div>
    </>
  );
}
