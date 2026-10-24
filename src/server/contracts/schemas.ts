/**
 * Zod schemas module Hợp đồng (DATA-MODEL §4.29).
 */

import { z } from "zod";

export const contractStatusSchema = z.enum([
  "DRAFT",
  "REVIEW",
  "SIGNED",
  "ACTIVE",
  "EXPIRED",
  "TERMINATED",
  "RENEWED"
]);

export const contractEventKindSchema = z.enum([
  "CREATED",
  "SENT",
  "SIGNED",
  "ACTIVATED",
  "RENEWED",
  "TERMINATED",
  "EXPIRED",
  "NOTE"
]);

const money = z.coerce.number().nonnegative("Số tiền không được âm");
const optionalDate = z.coerce.date().optional();

export const contractCreateSchema = z.object({
  title: z.string().min(1, "Tiêu đề hợp đồng bắt buộc").max(200),
  clientId: z.string().cuid(),
  quoteId: z.string().cuid().optional(),
  matterId: z.string().cuid().optional(),
  amount: money,
  currency: z.string().max(8).default("VND"),
  scope: z.string().max(2000).optional(),
  paymentTerms: z.string().max(1000).optional(),
  termNote: z.string().max(1000).optional(),
  signedAt: optionalDate,
  effectiveAt: optionalDate,
  expiresAt: optionalDate,
  renewRemindDays: z.coerce.number().int().min(0).max(365).default(30)
});

export const contractUpdateSchema = contractCreateSchema.extend({ id: z.string().cuid() });

export const contractListFilterSchema = z.object({
  status: contractStatusSchema.optional(),
  clientId: z.string().cuid().optional(),
  expiringWithinDays: z.coerce.number().int().min(1).max(365).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const contractIdSchema = z.object({ id: z.string().cuid() });

export const contractRenewSchema = z.object({
  id: z.string().cuid(),
  expiresAt: z.coerce.date(),
  note: z.string().max(500).optional()
});

export const contractEventCreateSchema = z.object({
  id: z.string().cuid(),
  kind: contractEventKindSchema,
  detail: z.string().max(500).optional()
});

/** Trạng thái cho phép chỉnh sửa nội dung */
export const CONTRACT_EDITABLE_STATUSES = ["DRAFT", "REVIEW"] as const;

export type ContractCreateInput = z.infer<typeof contractCreateSchema>;
export type ContractUpdateInput = z.infer<typeof contractUpdateSchema>;
export type ContractListFilter = z.infer<typeof contractListFilterSchema>;
export type ContractRenewInput = z.infer<typeof contractRenewSchema>;
