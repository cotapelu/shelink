"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { getArchivePrepData } from "@/server/archive/actions";
import { applyPrepData, toDateInput, type PrepState } from "./archive-wizard-helpers";

export interface LinkedDoc {
  id: string;
  name: string;
}

export interface ArchivePrepData extends PrepState {
  loading: boolean;
  setCompletedAt: (v: string) => void;
  setSummary: (v: string) => void;
  refreshPrep: () => Promise<void>;
}

function initialPrepState(): PrepState {
  return { checklist: null, checked: {}, linkedDocs: {}, completedAt: toDateInput(new Date()), summary: "" };
}

/** Nạp prep lúc mount + quản lý cờ loading (tách để hook chính ≤20 dòng). */
function usePrepLoader(matterId: string, refreshPrep: () => Promise<void>): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    refreshPrep()
      .catch((err) => toast.error("Tải dữ liệu lưu trữ thất bại", { description: err instanceof Error ? err.message : "" }))
      .finally(() => setLoading(false));
  }, [matterId, refreshPrep]);
  return loading;
}

/**
 * Nạp dữ liệu chuẩn bị lưu trữ + sở hữu state form liên quan.
 * Tách từ useArchiveWizard (R-refactor AUTO-55).
 */
export function useArchivePrep({ matterId }: { matterId: string }): ArchivePrepData {
  const [prep, setPrep] = useState<PrepState>(initialPrepState);

  const refreshPrep = useCallback(async () => {
    const data = await getArchivePrepData(matterId);
    setPrep((prev) => applyPrepData(prev, data));
  }, [matterId]);

  const loading = usePrepLoader(matterId, refreshPrep);
  const updatePrep = useCallback((patch: Partial<PrepState>) => setPrep((p) => ({ ...p, ...patch })), []);
  const setCompletedAt = useCallback((v: string) => updatePrep({ completedAt: v }), [updatePrep]);
  const setSummary = useCallback((v: string) => updatePrep({ summary: v }), [updatePrep]);

  return { loading, ...prep, setCompletedAt, setSummary, refreshPrep };
}
