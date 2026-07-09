"use client";

import { SEAL_TYPE_CN } from "./seal-types";

export function SealRowType({ type }: { type: string }) {
  return <td className="px-3 py-2">{SEAL_TYPE_CN[type] ?? type}</td>;
}
