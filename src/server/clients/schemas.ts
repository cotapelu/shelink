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

export const clientTypeSchema = z.enum(["INDIVIDUAL", "COMPANY", "ORGANIZATION"]);
export const cooperationStatusSchema = z.enum([
  "POTENTIAL",
  "NEGOTIATING",
  "SIGNED",
  "TERMINATED"
]);
export const clientGenderSchema = z.enum(["MALE", "FEMALE"]);

export const contactInputSchema = z.object({
  name: z.string().min(1, "联系人姓名必填").max(40),
  title: z.string().max(40).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
  wechat: z.string().max(40).optional().or(z.literal("")),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(500).optional().or(z.literal(""))
});

export const clientCreateSchema = z.object({
  name: z.string().min(1, "客户名称必填").max(120),
  type: clientTypeSchema,
  idNumber: z.string().max(50).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  legalRep: z.string().max(40).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
  source: z.string().max(80).optional().or(z.literal("")),
  // v0.39: 案件云式补充字段（internalCode 系统生成，不收用户输入）
  cooperationStatus: cooperationStatusSchema.default("SIGNED"),
  industry: z.string().max(60).optional().or(z.literal("")),
  gender: clientGenderSchema.optional().or(z.literal("")),
  ethnicity: z.string().max(30).optional().or(z.literal("")),
  tags: z.array(z.string().max(20)).default([]),
  notes: z.string().max(1000).optional().or(z.literal("")),
  contacts: z.array(contactInputSchema).default([])
});

export const clientUpdateSchema = clientCreateSchema.extend({
  id: z.string().cuid()
});

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
export type ContactInput = z.infer<typeof contactInputSchema>;

export const clientListQuerySchema = z.object({
  search: z.string().optional(),
  type: clientTypeSchema.optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type ClientListQuery = z.infer<typeof clientListQuerySchema>;
