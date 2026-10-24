/**
 * Zod schemas cho module Quỹ (DATA-MODEL §4.31). Tiền tệ Decimal(14,2).
 */

import { z } from "zod";

export const cashAccountTypeSchema = z.enum(["CASH", "BANK", "EWALLET"]);

const money = z.coerce.number().nonnegative("Số tiền không được âm").max(999999999999);

export const cashAccountCreateSchema = z.object({
  name: z.string().min(1, "Tên quỹ bắt buộc").max(120),
  type: cashAccountTypeSchema,
  currency: z.string().trim().min(1).max(8).default("VND"),
  openingBalance: money.default(0),
  bankName: z.string().trim().max(120).optional(),
  accountNoMasked: z.string().trim().max(32).optional(),
  note: z.string().trim().max(2000).optional()
});

export const cashAccountUpdateSchema = cashAccountCreateSchema.extend({
  id: z.string().cuid(),
  active: z.boolean().optional()
});

export const cashAccountIdSchema = z.object({ id: z.string().cuid() });

export type CashAccountCreateInput = z.infer<typeof cashAccountCreateSchema>;
export type CashAccountUpdateInput = z.infer<typeof cashAccountUpdateSchema>;
