"use client";

import { useMemo } from "react";
import type { PurposePreset } from "./use-seal-request-form-helpers";
import { UseSealRequestFormReturn } from "./use-seal-request-form-helpers";
import { useSealRequestFormState } from "./use-seal-request-form-state";
import { createSealRequestFormActions } from "./use-seal-request-form-actions";
import type { SealTypeConfigRow, MatterOption } from "./seal-types";

export function useSealRequestForm({
  configs,
  matters,
  preset,
  onOpenChange,
}: {
  configs: SealTypeConfigRow[];
  matters: MatterOption[];
  preset: { draftDocId?: string; matterId?: string; documentTitle?: string } | null;
  onOpenChange: (o: boolean) => void;
}): UseSealRequestFormReturn {
  const state = useSealRequestFormState({ preset });
  const actions = useMemo(
    () =>
      createSealRequestFormActions(state, {
        draftDocId: preset?.draftDocId,
      }, onOpenChange),
    [state, preset, onOpenChange]
  );

  // Return full interface
  return {
    ...state,
    ...actions,
  } as UseSealRequestFormReturn;
}
