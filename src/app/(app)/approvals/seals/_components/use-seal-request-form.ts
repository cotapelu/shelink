"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { UseSealRequestFormReturn } from "./use-seal-request-form-helpers";
import { useSealRequestFormState } from "./use-seal-request-form-state";
import { createSealRequestFormActions } from "./use-seal-request-form-actions";

export function useSealRequestForm({ preset, onOpenChange }: { preset: { draftDocId?: string; matterId?: string; documentTitle?: string } | null; onOpenChange: (o: boolean) => void; }): UseSealRequestFormReturn {
  const state = useSealRequestFormState({ preset });
  const router = useRouter();
  const actions = useMemo(() => createSealRequestFormActions(state, { draftDocId: preset?.draftDocId }, onOpenChange, router), [state, preset, onOpenChange, router]);
  return { ...state, ...actions } as UseSealRequestFormReturn;
}
