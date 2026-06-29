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

export const expressCreateSchema = z.object({
  trackingNo: z.string().min(6, "单号至少 6 位").max(40),
  companyCode: z.string().max(20).optional().or(z.literal("")), // 中文公司名
  direction: z.enum(["OUTBOUND", "INBOUND"]),
  matterId: z.string().cuid().optional().nullable(),
  purpose: z.string().min(1, "用途必填").max(200),
  recipient: z.string().max(80).optional().or(z.literal("")),
  recipientPhone: z.string().max(20).optional().or(z.literal(""))
});

export const expressListFilterSchema = z.object({
  scope: z.enum(["mine", "all"]).default("all"),
  direction: z.enum(["OUTBOUND", "INBOUND", "ALL"]).default("ALL"),
  matterId: z.string().cuid().optional(),
  search: z.string().max(80).optional().or(z.literal(""))
});

export const expressIdSchema = z.object({ id: z.string().cuid() });

// 配置
export const expressSettingsSaveSchema = z.object({
  kdniaoEbusinessId: z.string().max(40).optional().or(z.literal("")),
  kdniaoAppKey: z.string().max(80).optional().or(z.literal("")),
  kdniaoClearKey: z.boolean().optional(),
  kuaidi100Customer: z.string().max(40).optional().or(z.literal("")),
  kuaidi100Key: z.string().max(80).optional().or(z.literal("")),
  kuaidi100ClearKey: z.boolean().optional()
});
