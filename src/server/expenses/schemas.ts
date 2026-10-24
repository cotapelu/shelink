/**
 * Zod schemas module Chi phí / đề nghị thanh toán (DATA-MODEL §4.31).
 */

import { z } from "zod";

export const expenseStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "PAID",
  "CANCELLED"
]);

export const expenseCategorySchema = z.enum([
  "TRAVEL",
  "HOSPITALITY",
  "OFFICE",
  "OUTSOURCING",
  "EQUIPMENT",
  "TAX_FEE",
  "OTHER"
]);

const money = z.coerce.number().positive("Số tiền phải > 0");

export const expenseCreateSchema = z.object({
  title: z.string().min(1, "Nội dung chi phí bắt buộc").max(200),
  category: expenseCategorySchema,
  amount: money,
  occurredAt: z.coerce.date(),
  matterId: z.string().cuid().optional(),
  cashAccountId: z.string().cuid().optional(),
  receiptDocId: z.string().cuid().optional(),
  vendor: z.string().max(200).optional(),
  note: z.string().max(1000).optional()
});

export const expenseUpdateSchema = expenseCreateSchema.extend({ id: z.string().cuid() });

export const expenseListFilterSchema = z.object({
  status: expenseStatusSchema.optional(),
  category: expenseCategorySchema.optional(),
  claimantUserId: z.string().cuid().optional(),
  matterId: z.string().cuid().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const expenseIdSchema = z.object({ id: z.string().cuid() });

export const expenseRejectSchema = z.object({
  id: z.string().cuid(),
  reason: z.string().min(1, "Lý do từ chối bắt buộc").max(500)
});

export const expensePaySchema = z.object({
  id: z.string().cuid(),
  cashAccountId: z.string().cuid().optional(),
  paidAt: z.coerce.date().optional()
});

export const EXPENSE_EDITABLE_STATUSES = ["DRAFT"] as const;

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseListFilter = z.infer<typeof expenseListFilterSchema>;
