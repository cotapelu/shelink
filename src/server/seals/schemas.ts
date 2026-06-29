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
