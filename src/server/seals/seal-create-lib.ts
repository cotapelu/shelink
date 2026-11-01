/*
 * Hàm thuần cho createSealRequest — tách khỏi action để test
 * (R-refactor AUTO-65). Không import Prisma/DB: chỉ map form + dựng payload.
 */

import type { SealType, Urgency } from "@prisma/client";

/** Thông tin văn bản đã mã hóa (dùng chung cho bản nháp & bản sao). */
export type DocPrepare = {
  name: string;
  mimeType: string;
  size: number;
  sha: string;
  path: string;
  algorithm: string;
  iv: string;
  authTag: string;
};

/** Raw form trước khi qua schema (giống hệt action gốc). */
export function buildSealFormRaw(formData: FormData) {
  return {
    sealType: formData.get("sealType"),
    matterId: formData.get("matterId") || null,
    purpose: formData.get("purpose"),
    documentTitle: formData.get("documentTitle"),
    pageCount: formData.get("pageCount") ?? "1",
    requireCrossPageSeal: formData.get("requireCrossPageSeal") === "true",
    copies: formData.get("copies") ?? "1",
    urgency: formData.get("urgency") ?? "NORMAL",
    requestNote: formData.get("requestNote") || "",
    parentSealRequestId: formData.get("parentSealRequestId") || null
  };
}

/** Có tạo thêm yêu cầu con đại diện pháp luật không (cờ true & type khác LEGAL_REP_SEAL). */
export function deriveAlsoLegalRep(formData: FormData, sealType: string): boolean {
  return formData.get("alsoLegalRep") === "true" && sealType !== "LEGAL_REP_SEAL";
}

const DRAFT_DOC_TAGS = ["Yeu cau dong dau", "Ban nhap cho dong dau"];
const LEGAL_REP_COPY_TAG = "Ban sao dau dai dien phap luat";

/** Payload Document cho bản nháp/bản sao (mã hóa, category OTHER). */
export function toSealDocumentData(
  prepare: DocPrepare,
  opts: { uploadedById: string; matterId: string | null | undefined; extraTags?: string[] }
) {
  return {
    matterId: opts.matterId ?? undefined,
    name: prepare.name,
    category: "OTHER" as const,
    path: prepare.path,
    mimeType: prepare.mimeType,
    size: prepare.size,
    sha256: prepare.sha,
    encrypted: true,
    algorithm: prepare.algorithm,
    iv: prepare.iv,
    authTag: prepare.authTag,
    tags: opts.extraTags ? [...DRAFT_DOC_TAGS, ...opts.extraTags] : DRAFT_DOC_TAGS,
    uploadedById: opts.uploadedById
  };
}

/** Input SealRequest sau khi qua schema (mấy field optional theo zod). */
export type SealRequestInputLike = {
  sealType: string;
  matterId?: string | null;
  purpose: string;
  documentTitle: string;
  pageCount: number;
  requireCrossPageSeal: boolean;
  copies: number;
  urgency: string;
  requestNote?: string | null;
  parentSealRequestId?: string | null;
};

/** Payload SealRequest chính (trim text, requestNote rỗng → null). */
export function toSealRequestData(
  data: SealRequestInputLike,
  ctx: { draftDocId: string; requestedById: string; code: string }
) {
  return {
    code: ctx.code,
    sealType: data.sealType as SealType,
    matterId: data.matterId ?? undefined,
    purpose: data.purpose.trim(),
    documentTitle: data.documentTitle.trim(),
    pageCount: data.pageCount, requireCrossPageSeal: data.requireCrossPageSeal, copies: data.copies,
    urgency: data.urgency as Urgency,
    requestNote: (data.requestNote || "").trim() || null,
    draftDocId: ctx.draftDocId, requestedById: ctx.requestedById, status: "PENDING" as const,
    parentSealRequestId: data.parentSealRequestId ?? undefined
  };
}

/** Payload SealRequest con (đại diện pháp luật): type + purpose đánh dấu yêu cầu cha. */
export function toLegalRepSealRequestData(
  data: Parameters<typeof toSealRequestData>[0],
  ctx: { draftDocId: string; requestedById: string; code: string; parentSealId: string; parentCode: string }
) {
  return {
    ...toSealRequestData(data, { draftDocId: ctx.draftDocId, requestedById: ctx.requestedById, code: ctx.code }),
    sealType: "LEGAL_REP_SEAL" as SealType,
    purpose: `${data.purpose.trim()} (dong thoi voi ${ctx.parentCode})`,
    draftDocId: ctx.draftDocId,
    parentSealRequestId: ctx.parentSealId
  };
}

/** Tag bản sao đại diện pháp luật (dùng khi document prepare copy). */
export const LEGAL_REP_EXTRA_TAGS = [LEGAL_REP_COPY_TAG];
