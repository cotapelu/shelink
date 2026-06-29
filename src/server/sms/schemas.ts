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

export const smsParseAndSaveSchema = z.object({
  rawText: z.string().min(1, "短信内容必填").max(8000),
  batch: z.boolean().default(false), // 按空行分隔多条
  useAi: z.boolean().default(false) // v0.9.1：调 AI 抽 summary/action/urgency
});

export const smsListFilterSchema = z.object({
  scope: z.enum(["mine", "all"]).default("mine"),
  processed: z.enum(["unprocessed", "processed", "all"]).default("unprocessed"),
  smsType: z
    .enum([
      "HEARING_NOTICE",
      "SERVICE_NOTICE",
      "FEE_NOTICE",
      "MEDIATION",
      "ENFORCEMENT",
      "FILING_NOTICE",
      "JUDGMENT_NOTICE",
      "EVIDENCE_SUBMIT",
      "OTHER"
    ])
    .optional()
});

export const smsMatchToMatterSchema = z.object({
  smsId: z.string().cuid(),
  matterId: z.string().cuid().nullable()
});

export const smsGenerateHearingSchema = z.object({
  smsId: z.string().cuid(),
  procedureId: z.string().cuid(),
  title: z.string().min(1).max(100),
  startsAt: z.coerce.date(),
  room: z.string().max(80).optional().or(z.literal("")),
  judge: z.string().max(40).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal(""))
});

export const smsGenerateDeadlineSchema = z.object({
  smsId: z.string().cuid(),
  procedureId: z.string().cuid(),
  title: z.string().min(1).max(100),
  category: z
    .enum([
      "LIMITATION",
      "EVIDENCE",
      "APPEAL",
      "PERFORMANCE",
      "RESPONSE",
      "ENFORCEMENT",
      "ARBITRATION_SET_ASIDE",
      "CUSTOM"
    ])
    .default("CUSTOM"),
  dueAt: z.coerce.date(),
  basis: z.string().max(200).optional().or(z.literal("")),
  remindDays: z.coerce.number().int().positive().default(3)
});

export const smsIdSchema = z.object({ id: z.string().cuid() });
