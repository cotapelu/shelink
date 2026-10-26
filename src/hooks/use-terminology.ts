"use client";

/**
 * Lấy thuật ngữ hiển thị đã cấu hình (TD-G1). Thứ tự ưu tiên:
 *   1. `stored` có giá trị (test/legacy) → resolveTerms(stored)
 *   2. context từ <TerminologyProvider> ((app)/layout nạp từ SystemSetting)
 *   3. DEFAULT_TERMS
 */

import { useContext } from "react";
import { TerminologyContext } from "@/components/layout/terminology-provider";
import { DEFAULT_TERMS, resolveTerms, type TermKey } from "@/lib/terminology";

export type Terms = Record<TermKey, string>;

export function useTerminology(stored?: Record<string, string> | null): Terms {
  const fromContext = useContext(TerminologyContext);
  if (stored) return resolveTerms(stored);
  return fromContext ?? DEFAULT_TERMS;
}
