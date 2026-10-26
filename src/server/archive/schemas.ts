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

export const archiveClosedReasonSchema = z.enum([
  "JUDGMENT",
  "MEDIATION",
  "WITHDRAWAL",
  "SETTLEMENT",
  "RULING",
  "OTHER"
]);

export const archiveSubmitSchema = z.object({
  matterId: z.string().cuid(),
  summary: z.string().min(1, "Tóm tắt kết thúc vụ là bắt buộc").max(4000),
  closedReason: archiveClosedReasonSchema,
  completedAt: z.coerce.date(),
  judgmentSummary: z.string().max(2000).optional().or(z.literal("")),
  // Trạng thái tích chọn checklist: { itemId: true/false }
  checklist: z.record(z.boolean()).default({}),
  // Luật sư xác nhận ép buộc lưu trữ (khi thiếu hạng mục bắt buộc phải là true mới gửi được)
  forceWithMissing: z.boolean().default(false)
});

export type ArchiveSubmitInput = z.infer<typeof archiveSubmitSchema>;

export const CLOSED_REASON_CN: Record<z.infer<typeof archiveClosedReasonSchema>, string> = {
  JUDGMENT: "Bản án",
  MEDIATION: "Hòa giải",
  WITHDRAWAL: "Rút đơn kiện",
  SETTLEMENT: "Thỏa thuận dừng kiện",
  RULING: "Quyết định",
  OTHER: "Khác"
};
