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
import { procedureTypeSchema } from "@/server/matters/schemas";

export const procedureEngagementSchema = z.enum(["ENGAGED", "INFORMATIONAL"]);

export const procedureStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "CONCLUDED"]);

export const procedureOutcomeSchema = z.enum([
  "WON",
  "PARTIAL_WON",
  "LOST",
  "MEDIATED",
  "WITHDRAWN",
  "DISMISSED",
  "COMPLETED",
  "TRANSFERRED",
  "OTHER"
]);

export const procedureCreateSchema = z.object({
  matterId: z.string().cuid(),
  type: procedureTypeSchema,
  customLabel: z.string().max(40).optional().or(z.literal("")),
  engagement: procedureEngagementSchema.default("ENGAGED"),
  caseNumber: z.string().max(80).optional().or(z.literal("")),
  jurisdiction: z.string().max(120).optional().or(z.literal("")),
  handlingAgency: z.string().max(120).optional().or(z.literal("")),
  panel: z.string().max(80).optional().or(z.literal("")),
  handler: z.string().max(40).optional().or(z.literal("")),
  acceptedAt: z.string().optional().nullable().transform(v => (!v ? undefined : new Date(v))),
  // v0.44: 主办律师
  leadLawyerId: z.string().cuid().optional().nullable(),
  isExternalLead: z.boolean().default(false)
});

export const procedureUpdateSchema = z.object({
  id: z.string().cuid(),
  type: procedureTypeSchema.optional(),
  customLabel: z.string().max(40).optional().or(z.literal("")),
  caseNumber: z.string().max(80).optional().or(z.literal("")),
  jurisdiction: z.string().max(120).optional().or(z.literal("")),
  handlingAgency: z.string().max(120).optional().or(z.literal("")),
  panel: z.string().max(80).optional().or(z.literal("")),
  handler: z.string().max(40).optional().or(z.literal("")),
  acceptedAt: z.string().optional().nullable().transform(v => (!v ? undefined : new Date(v))),
  concludedAt: z.coerce.date().optional(),
  status: procedureStatusSchema.optional(),
  outcome: procedureOutcomeSchema.optional(),
  outcomeNote: z.string().max(500).optional().or(z.literal(""))
});

export const deadlineCategorySchema = z.enum([
  "LIMITATION",
  "EVIDENCE",
  "APPEAL",
  "PERFORMANCE",
  "RESPONSE",
  "ENFORCEMENT",
  "ARBITRATION_SET_ASIDE",
  "PRESERVATION",
  "CUSTOM"
]);

export const deadlineCreateSchema = z.object({
  procedureId: z.string().cuid(),
  title: z.string().min(1, "期限名称必填").max(100),
  category: deadlineCategorySchema.default("CUSTOM"),
  dueAt: z.coerce.date(),
  basis: z.string().max(200).optional().or(z.literal("")),
  remindDays: z.coerce.number().int().min(0).max(60).default(3)
});

export const hearingCreateSchema = z.object({
  procedureId: z.string().cuid(),
  title: z.string().min(1, "开庭主题必填").max(80),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  room: z.string().max(40).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  judge: z.string().max(40).optional().or(z.literal("")),
  contact: z.string().max(80).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal(""))
});

export type ProcedureCreateInput = z.infer<typeof procedureCreateSchema>;
export type ProcedureUpdateInput = z.infer<typeof procedureUpdateSchema>;
export type DeadlineCreateInput = z.infer<typeof deadlineCreateSchema>;
export type HearingCreateInput = z.infer<typeof hearingCreateSchema>;
