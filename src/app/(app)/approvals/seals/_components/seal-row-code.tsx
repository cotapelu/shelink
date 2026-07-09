"use client";

export function SealRowCode({ code, onDetail }: { code: string; onDetail: () => void }) {
  return (
    <td className="px-3 py-2">
      <button
        type="button"
        onClick={onDetail}
        className="font-mono text-[11px] text-primary hover:underline"
        title="查看用章申请详情"
      >
        {code}
      </button>
    </td>
  );
}
