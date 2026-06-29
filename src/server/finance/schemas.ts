/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
import { z } from "zod";

export const feeEntryTypeSchema = z.enum([
  "RECEIVABLE",
  "RECEIVED",
  "REFUND",
  "COST",
  "COMMISSION"
]);

export const billingStatusSchema = z.enum(["DRAFT", "ACTIVE", "CLOSED"]);

export const billingCreateSchema = z.object({
  matterId: z.string().cuid(),
  title: z.string().min(1, "合同名称必填").max(120),
  contractAmount: z.coerce.number().nonnegative(),
  schedule: z.string().max(1000).optional().or(z.literal("")),
  status: billingStatusSchema.default("DRAFT"),
  signedAt: z.coerce.date().optional()
});

export const feeEntryCreateSchema = z.object({
  matterId: z.string().cuid(),
  billingId: z.string().cuid().optional().or(z.literal("")),
  type: feeEntryTypeSchema,
  amount: z.coerce.number(),
  occurredAt: z.coerce.date().default(() => new Date()),
  invoiceNo: z.string().max(50).optional().or(z.literal("")),
  payerOrPayee: z.string().max(80).optional().or(z.literal("")),
  method: z.string().max(40).optional().or(z.literal("")),
  note: z.string().max(500).optional().or(z.literal(""))
});

export const commissionPlanSetSchema = z.object({
  matterId: z.string().cuid(),
  items: z
    .array(
      z.object({
        userId: z.string().cuid(),
        percent: z.coerce.number().min(0).max(100),
        label: z.string().max(40).optional().or(z.literal(""))
      })
    )
    .default([])
});

export type BillingCreateInput = z.infer<typeof billingCreateSchema>;
export type FeeEntryCreateInput = z.infer<typeof feeEntryCreateSchema>;
export type CommissionPlanSetInput = z.infer<typeof commissionPlanSetSchema>;
