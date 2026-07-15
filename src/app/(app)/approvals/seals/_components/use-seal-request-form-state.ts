"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { computeResolvedPurpose } from "./use-seal-request-form-helpers";
import type { PurposePreset } from "./use-seal-request-form-helpers";

export interface SealRequestFormState {
  sealType: string;
  setSealType: (v: string) => void;
  matterId: string;
  setMatterId: (v: string) => void;
  purposePreset: PurposePreset | "";
  setPurposePreset: (v: PurposePreset | "") => void;
  purposeOther: string;
  setPurposeOther: (v: string) => void;
  documentTitle: string;
  setDocumentTitle: (v: string) => void;
  pageCount: number;
  setPageCount: (v: number) => void;
  crossPage: boolean;
  setCrossPage: (v: boolean) => void;
  copies: number;
  setCopies: (v: number) => void;
  urgency: "NORMAL" | "URGENT";
  setUrgency: (v: "NORMAL" | "URGENT") => void;
  requestNote: string;
  setRequestNote: (v: string) => void;
  file: File | null;
  setFile: (v: File | null) => void;
  alsoLegalRep: boolean;
  setAlsoLegalRep: (v: boolean) => void;
  pending: boolean;
  startTransition: (cb: () => void) => void;
  resolvedPurpose: string;
}

export function useSealRequestFormState({
  preset,
}: {
  preset: { draftDocId?: string; matterId?: string; documentTitle?: string } | null;
}): SealRequestFormState {
  const [sealType, setSealType] = useState<string>("");
  const [matterId, setMatterId] = useState<string>("");
  const [purposePreset, setPurposePreset] = useState<PurposePreset | "">("");
  const [purposeOther, setPurposeOther] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [pageCount, setPageCount] = useState(1);
  const [crossPage, setCrossPage] = useState(false);
  const [copies, setCopies] = useState(1);
  const [urgency, setUrgency] = useState<"NORMAL" | "URGENT">("NORMAL");
  const [requestNote, setRequestNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [alsoLegalRep, setAlsoLegalRep] = useState(false);
  const [pending, startTransition] = useTransition();

  // 卷宗联动预填
  useEffect(() => {
    if (preset?.matterId) setMatterId(preset.matterId);
    if (preset?.documentTitle) setDocumentTitle(preset.documentTitle);
  }, [preset]);

  const resolvedPurpose = computeResolvedPurpose(purposePreset, purposeOther);

  return {
    // State
    sealType,
    setSealType,
    matterId,
    setMatterId,
    purposePreset,
    setPurposePreset,
    purposeOther,
    setPurposeOther,
    documentTitle,
    setDocumentTitle,
    pageCount,
    setPageCount,
    crossPage,
    setCrossPage,
    copies,
    setCopies,
    urgency,
    setUrgency,
    requestNote,
    setRequestNote,
    file,
    setFile,
    alsoLegalRep,
    setAlsoLegalRep,
    pending,
    startTransition,
    // Computed
    resolvedPurpose,
  };
}
