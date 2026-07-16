"use client";

interface AuditTableDetailRowProps {
  entryId: string;
  detail: any;
}

export function AuditTableDetailRow({ entryId, detail }: AuditTableDetailRowProps) {
  return (
    <tr>
      <td></td>
      <td colSpan={6} className="px-2 pb-2 pt-0">
        <pre className="overflow-x-auto rounded bg-muted/40 p-2 font-mono text-[10px] text-foreground">
          {JSON.stringify(detail, null, 2)}
        </pre>
      </td>
    </tr>
  );
}
