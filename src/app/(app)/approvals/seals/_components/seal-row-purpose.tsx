"use client";

export function SealRowPurpose({ purpose }: { purpose: string }) {
  return (
    <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground" title={purpose}>
      {purpose}
    </td>
  );
}
