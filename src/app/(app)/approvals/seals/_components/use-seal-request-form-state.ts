"use client";

import { useState, useTransition, useEffect } from "react";
import { computeResolvedPurpose } from "./use-seal-request-form-helpers";
import type { PurposePreset } from "./use-seal-request-form-helpers";

export interface SealRequestFormState {
  sealType: string; setSealType: (v: string) => void;
  matterId: string; setMatterId: (v: string) => void;
  purposePreset: PurposePreset | ""; setPurposePreset: (v: PurposePreset | "") => void;
  purposeOther: string; setPurposeOther: (v: string) => void;
  documentTitle: string; setDocumentTitle: (v: string) => void;
  pageCount: number; setPageCount: (v: number) => void;
  crossPage: boolean; setCrossPage: (v: boolean) => void;
  copies: number; setCopies: (v: number) => void;
  urgency: "NORMAL" | "URGENT"; setUrgency: (v: "NORMAL" | "URGENT") => void;
  requestNote: string; setRequestNote: (v: string) => void;
  file: File | null; setFile: (v: File | null) => void;
  alsoLegalRep: boolean; setAlsoLegalRep: (v: boolean) => void;
  pending: boolean; startTransition: (cb: () => void) => void;
  resolvedPurpose: string;
}

function useSealBasicFields(preset: { draftDocId?: string; matterId?: string; documentTitle?: string } | null) {
  const [sealType, setSealType] = useState("");
  const [matterId, setMatterId] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  useEffect(() => {
    if (preset?.matterId) setMatterId(preset.matterId);
    if (preset?.documentTitle) setDocumentTitle(preset.documentTitle);
  }, [preset]);
  return { sealType, setSealType, matterId, setMatterId, documentTitle, setDocumentTitle };
}

function usePurposeFields() {
  const [purposePreset, setPurposePreset] = useState<PurposePreset | "">("");
  const [purposeOther, setPurposeOther] = useState("");
  const resolvedPurpose = computeResolvedPurpose(purposePreset, purposeOther);
  return { purposePreset, setPurposePreset, purposeOther, setPurposeOther, resolvedPurpose };
}

function useOptionFields() {
  const [pageCount, setPageCount] = useState(1);
  const [crossPage, setCrossPage] = useState(false);
  const [copies, setCopies] = useState(1);
  const [urgency, setUrgency] = useState<"NORMAL" | "URGENT">("NORMAL");
  const [requestNote, setRequestNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [alsoLegalRep, setAlsoLegalRep] = useState(false);
  return { pageCount, setPageCount, crossPage, setCrossPage, copies, setCopies, urgency, setUrgency, requestNote, setRequestNote, file, setFile, alsoLegalRep, setAlsoLegalRep };
}

function usePendingTransition() {
  const [pending, startTransition] = useTransition();
  return { pending, startTransition };
}

export function useSealRequestFormState({ preset }: { preset: { draftDocId?: string; matterId?: string; documentTitle?: string } | null }): SealRequestFormState {
  const basic = useSealBasicFields(preset);
  const purpose = usePurposeFields();
  const options = useOptionFields();
  const { pending, startTransition } = usePendingTransition();
  return { ...basic, ...purpose, ...options, pending, startTransition };
}
