"use client";

import { SEAL_STATUS_CN, SEAL_STATUS_COLOR } from "./seal-types";

export function SealRowStatus({ status }: { status: string }) {
  const colors = SEAL_STATUS_COLOR[status];
  return (
    <td className="px-3 py-2">
      <span
        className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]"
        style={{
          background: colors.bg,
          color: colors.text,
          borderColor: colors.border
        }}
      >
        {SEAL_STATUS_CN[status]}
      </span>
    </td>
  );
}
