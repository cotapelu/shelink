"use client";

import { toast } from "sonner";
import { createSealRequest } from "@/server/seals/actions";
import { useRouter } from "next/navigation";
import {
  validateForm,
  buildFormData,
} from "./use-seal-request-form-helpers";
import type { SealRequestFormState } from "./use-seal-request-form-state";
import type { PurposePreset } from "./use-seal-request-form-helpers";

export function createSealRequestFormActions(
  state: SealRequestFormState,
  preset: { draftDocId?: string } | null,
  onOpenChange: (o: boolean) => void
) {
  const router = useRouter();

  const reset = () => {
    state.setSealType("");
    state.setMatterId("");
    state.setPurposePreset("");
    state.setPurposeOther("");
    state.setDocumentTitle("");
    state.setPageCount(1);
    state.setCrossPage(false);
    state.setCopies(1);
    state.setUrgency("NORMAL");
    state.setRequestNote("");
    state.setFile(null);
    state.setAlsoLegalRep(false);
    onOpenChange(false);
  };

  const submit = async () => {
    const error = validateForm(
      state.sealType,
      state.purposePreset,
      state.purposeOther,
      state.documentTitle,
      !!preset?.draftDocId,
      state.file
    );
    if (error) {
      toast.error(error);
      return;
    }

    const fd = buildFormData(
      state.sealType,
      state.matterId,
      state.resolvedPurpose,
      state.documentTitle,
      state.pageCount,
      state.crossPage,
      state.copies,
      state.urgency,
      state.requestNote,
      state.alsoLegalRep,
      !!preset?.draftDocId,
      preset,
      state.file
    );

    state.startTransition(async () => {
      try {
        const res = await createSealRequest(fd);
        toast.success(
          `已提交 ${res.code}${state.alsoLegalRep && state.sealType !== "LEGAL_REP_SEAL" ? "（含法人章配套申请）" : ""}`
        );
        reset();
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "提交失败");
      }
    });
  };

  return { reset, submit };
}
