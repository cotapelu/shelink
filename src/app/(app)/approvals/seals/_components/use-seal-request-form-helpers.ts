/*
 * Helper functions for useSealRequestForm
 * Extracted to reduce hook complexity and function size
 */

/**
 * Preset purposes for seal requests
 */
export const PURPOSE_PRESETS = ["委托合同", "法律意见书", "所函", "证明", "其他"] as const;
export type PurposePreset = typeof PURPOSE_PRESETS[number];

/**
 * UseSealRequestFormReturn interface
 */
export interface UseSealRequestFormReturn {
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
  reset: () => void;
  resolvedPurpose: string;
  submit: () => Promise<void>;
}

/**
 * Compute the actual purpose string from preset and other input
 */
export function computeResolvedPurpose(
  purposePreset: PurposePreset | "",
  purposeOther: string
): string {
  if (purposePreset === "其他") {
    const trimmed = purposeOther.trim();
    return trimmed ? `其他：${trimmed}` : "";
  }
  return purposePreset;
}

/**
 * Validate form inputs before submission
 * Returns error message or null if valid
 */
export function validateForm(
  sealType: string,
  purposePreset: PurposePreset | "",
  purposeOther: string,
  documentTitle: string,
  hasExisting: boolean,
  file: File | null
): string | null {
  return (
    validateSealType(sealType) ||
    validatePurpose(purposePreset, purposeOther) ||
    validateDocumentTitle(documentTitle) ||
    validateFile(hasExisting, file)
  );
}

function validateSealType(sealType: string): string | null {
  return sealType ? null : "请选择章种类";
}

function validatePurpose(
  purposePreset: PurposePreset | "",
  purposeOther: string
): string | null {
  if (!purposePreset) return "请选择用印事由";
  if (purposePreset === "其他" && !purposeOther.trim()) {
    return "请填写「其他」用印事由的具体说明";
  }
  return null;
}

function validateDocumentTitle(documentTitle: string): string | null {
  return documentTitle.trim() ? null : "请填写文件标题";
}

function validateFile(hasExisting: boolean, file: File | null): string | null {
  if (hasExisting) return null;
  if (!file) return "请上传待盖章稿";
  return isPdfFile(file) ? null : "需上传 pdf 格式文件";
}

/**
 * Check if file is PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

/**
 * Build FormData from form state
 */
export function buildFormData(sealType: string, matterId: string, resolvedPurpose: string, documentTitle: string, pageCount: number, crossPage: boolean, copies: number, urgency: "NORMAL" | "URGENT", requestNote: string, alsoLegalRep: boolean, hasExisting: boolean, preset: { draftDocId?: string } | null, file: File | null): FormData {
  const fd = new FormData();
  addBaseFields(fd, sealType, matterId, resolvedPurpose, documentTitle, pageCount, crossPage, copies, urgency, requestNote);
  addAlsoLegalRep(fd, alsoLegalRep, sealType);
  addExistingOrFile(fd, hasExisting, preset, file);
  return fd;
}

function addBaseFields(fd: FormData, sealType: string, matterId: string, resolvedPurpose: string, documentTitle: string, pageCount: number, crossPage: boolean, copies: number, urgency: "NORMAL" | "URGENT", requestNote: string) {
  fd.set("sealType", sealType);
  if (matterId) fd.set("matterId", matterId);
  fd.set("purpose", resolvedPurpose);
  fd.set("documentTitle", documentTitle.trim());
  fd.set("pageCount", String(pageCount));
  fd.set("requireCrossPageSeal", String(crossPage));
  fd.set("copies", String(copies));
  fd.set("urgency", urgency);
  fd.set("requestNote", requestNote.trim());
}

function addAlsoLegalRep(fd: FormData, alsoLegalRep: boolean, sealType: string) {
  if (alsoLegalRep && sealType !== "LEGAL_REP_SEAL") {
    fd.set("alsoLegalRep", "true");
  }
}

function addExistingOrFile(
  fd: FormData,
  hasExisting: boolean,
  preset: { draftDocId?: string } | null,
  file: File | null
) {
  if (hasExisting && preset?.draftDocId) {
    fd.set("existingDraftDocId", preset.draftDocId);
  } else if (file) {
    fd.set("draftDoc", file);
  }
}
