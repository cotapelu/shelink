"use client";

export function SealRowCode({ code, onDetail }: { code: string; onDetail: () => void }) {
  return (
    <td className="px-3 py-2">
      <button
        type="button"
        onClick={onDetail}
        className="font-mono text-[11px] text-primary hover:underline"
        title="Xem chi tiết yêu cầu dùng dấu"
      >
        {code}
      </button>
    </td>
  );
}
