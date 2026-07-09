"use client";

export function SealRowDate({ date }: { date: Date | string }) {
  return (
    <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
      {new Date(date).toLocaleDateString("zh-CN")}
    </td>
  );
}
