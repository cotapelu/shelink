"use client";

/**
 * Hook lấy thuật ngữ hiển thị đã cấu hình (client component).
 * Nhận prop từ server (page layout) để tránh fetch; fallback mặc định nếu thiếu.
 */

import { DEFAULT_TERMS, resolveTerms, type TermKey } from "@/lib/terminology";

export type Terms = Record<TermKey, string>;

export function useTerminology(stored?: Record<string, string> | null): Terms {
  return stored ? resolveTerms(stored) : DEFAULT_TERMS;
}
