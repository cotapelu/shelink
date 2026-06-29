/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { z } from "zod";

const presTypes = ["PRE_LITIGATION", "LITIGATION", "ENFORCEMENT"] as const;
const propertyTypes = [
  "BANK_DEPOSIT",
  "REAL_ESTATE",
  "VEHICLE",
  "EQUITY",
  "IP",
  "OTHER"
] as const;
const guaranteeTypes = ["CASH_DEPOSIT", "GUARANTEE_LETTER", "PROPERTY", "NONE"] as const;
const presStatuses = ["ACTIVE", "RENEWED", "EXPIRED", "LIFTED"] as const;

export const preservationCreateSchema = z.object({
  matterId: z.string().cuid().optional().nullable(),
  type: z.enum(presTypes),
  propertyType: z.enum(propertyTypes),
  amount: z.coerce.number().nonnegative().optional().nullable(),
  respondent: z.string().min(1, "被保全人必填").max(200),
  guaranteeType: z.enum(guaranteeTypes).optional().nullable(),

  appliedAt: z.coerce.date().optional().nullable(),
  startDate: z.coerce.date(),
  duration: z.coerce.number().int().positive().max(3650),
  expiryDate: z.coerce.date(),

  court: z.string().max(80).optional().or(z.literal("")),
  rulingNumber: z.string().max(80).optional().or(z.literal("")),
  propertyDetail: z.string().max(500).optional().or(z.literal("")),
  note: z.string().max(500).optional().or(z.literal("")),

  ownerId: z.string().cuid().optional().nullable(),
  remindDays: z.array(z.coerce.number().int().positive()).default([30, 15, 7, 3, 1])
});

export const preservationUpdateSchema = preservationCreateSchema.partial().extend({
  id: z.string().cuid()
});

export const preservationListFilterSchema = z.object({
  status: z.enum([...presStatuses, "ALL"]).default("ALL"),
  matterId: z.string().cuid().optional(),
  search: z.string().max(80).optional().or(z.literal(""))
});

export const preservationRenewSchema = z.object({
  id: z.string().cuid(),
  newExpiryDate: z.coerce.date(),
  renewalDuration: z.coerce.number().int().positive(),
  note: z.string().max(300).optional().or(z.literal(""))
});

export const preservationLiftSchema = z.object({
  id: z.string().cuid(),
  note: z.string().max(300).optional().or(z.literal(""))
});

export const preservationIdSchema = z.object({ id: z.string().cuid() });
