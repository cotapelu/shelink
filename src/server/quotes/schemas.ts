/**
 * Zod schemas cho module Báo giá (DATA-MODEL §4.28).
 */

import { z } from "zod";

export const quoteStatusSchema = z.enum([
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CONVERTED",
  "CANCELLED"
]);

const money = z.coerce.number().nonnegative("Số tiền không được âm");

export const quoteItemInputSchema = z.object({
  name: z.string().min(1, "Tên hạng mục bắt buộc").max(200),
  description: z.string().max(1000).optional(),
  unit: z.string().max(20).optional(),
  quantity: z.coerce.number().positive("Số lượng phải > 0").max(999999),
  unitPrice: money
});

export const quoteCreateSchema = z.object({
  title: z.string().min(1, "Tiêu đề báo giá bắt buộc").max(200),
  clientId: z.string().cuid(),
  contactId: z.string().cuid().optional(),
  matterId: z.string().cuid().optional(),
  intakeId: z.string().cuid().optional(),
  ownerUserId: z.string().cuid().optional(),
  currency: z.string().max(8).default("VND"),
  validDays: z.coerce.number().int().min(1).max(365).default(30),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
  note: z.string().max(2000).optional(),
  items: z.array(quoteItemInputSchema).min(1, "Báo giá cần ít nhất 1 hạng mục")
});

export const quoteUpdateSchema = quoteCreateSchema.extend({
  id: z.string().cuid()
});

export const quoteListFilterSchema = z.object({
  scope: z.enum(["all", "mine", "client"]).default("all"),
  status: quoteStatusSchema.optional(),
  clientId: z.string().cuid().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const quoteIdSchema = z.object({ id: z.string().cuid() });

export const convertQuoteSchema = z.object({
  id: z.string().cuid(),
  /** Hợp đồng mới: mặc định copy dữ liệu từ báo giá */
  title: z.string().min(1).max(200).optional(),
  signedAt: z.coerce.date().optional(),
  effectiveAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  paymentTerms: z.string().max(1000).optional(),
  /** Chuyển thành dự án: category Matter */
  category: z.string().max(50).optional()
});

export type QuoteCreateInput = z.infer<typeof quoteCreateSchema>;
export type QuoteUpdateInput = z.infer<typeof quoteUpdateSchema>;
export type QuoteListFilter = z.infer<typeof quoteListFilterSchema>;
export type ConvertQuoteInput = z.infer<typeof convertQuoteSchema>;
