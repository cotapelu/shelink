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

const sealTypes = [
  "OFFICIAL_SEAL",
  "CONTRACT_SEAL",
  "FINANCE_SEAL",
  "LEGAL_REP_SEAL",
  "CONTRACT_REVIEW_SEAL"
] as const;

export const sealCreateSchema = z.object({
  sealType: z.enum(sealTypes),
  matterId: z.string().cuid().optional().nullable(),
  purpose: z.string().min(1, "用章事由必填").max(500),
  documentTitle: z.string().min(1, "文件标题必填").max(200),
  pageCount: z.coerce.number().int().positive().default(1),
  requireCrossPageSeal: z.coerce.boolean().default(false),
  copies: z.coerce.number().int().positive().default(1),
  urgency: z.enum(["NORMAL", "URGENT"]).default("NORMAL"),
  requestNote: z.string().max(500).optional().or(z.literal("")),
  parentSealRequestId: z.string().cuid().optional().nullable()
});

export const sealApproveSchema = z.object({
  id: z.string().cuid(),
  note: z.string().max(500).optional().or(z.literal(""))
});

export const sealRejectSchema = z.object({
  id: z.string().cuid(),
  reason: z.string().min(1, "请说明驳回原因").max(500)
});

export const sealCancelSchema = z.object({
  id: z.string().cuid()
});

export const sealListFilterSchema = z.object({
  scope: z.enum(["mine", "approval", "all"]).default("mine"),
  status: z
    .enum(["PENDING", "APPROVED", "STAMPED", "REJECTED", "CANCELLED"])
    .optional(),
  sealType: z.enum(sealTypes).optional()
});

export type SealCreateInput = z.input<typeof sealCreateSchema>;
