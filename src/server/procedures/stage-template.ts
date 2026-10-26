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

/**
 * Sinh giai đoạn (MatterStage) cho một thủ tục từ mẫu giai đoạn mặc định theo loại hình
 * (DATA-MODEL §4.13 StageTemplate → §4.8 MatterStage). Mẫu cấu hình ở /settings/templates;
 * tài liệu UI đã ghi "chỉ ảnh hưởng thủ tục mới tạo" — đây là phần áp dụng còn thiếu.
 */

import type { ProcedureType } from "@prisma/client";

/** Giới hạn an toàn tránh dữ liệu cũ/hỏng gây phình bất thờ. */
export const MAX_TEMPLATE_STEPS = 50;
const MAX_STEP_NAME = 40;

export type TemplateStep = { name: string; order: number };

/** Client tối thiểu cần dùng — tương thích cả `prisma` lẫn transaction client. */
type StageSeedClient = {
  stageTemplate: {
    findUnique: (args: { where: { id: string } }) => Promise<{ steps: unknown } | null>;
  };
  matterStage: {
    createMany: (args: {
      data: Array<{ procedureId: string; name: string; order: number }>;
    }) => Promise<{ count: number }>;
  };
};

/**
 * Chuẩn hoá `steps` (Json) của StageTemplate thành danh sách giai đoạn hợp lệ.
 * Thuần, bền vững: bỏ mục không phải object/thiếu tên, cắt tên, ghép order, sắp xếp, chặn 50.
 */
export function normalizeStageSteps(raw: unknown): TemplateStep[] {
  if (!Array.isArray(raw)) return [];
  const steps: TemplateStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const name = (item as { name?: unknown }).name;
    const order = (item as { order?: unknown }).order;
    const cleanName = typeof name === "string" ? name.trim().slice(0, MAX_STEP_NAME) : "";
    if (!cleanName) continue;
    const cleanOrder =
      typeof order === "number" && Number.isFinite(order)
        ? Math.max(1, Math.floor(order))
        : steps.length + 1;
    steps.push({ name: cleanName, order: cleanOrder });
    if (steps.length >= MAX_TEMPLATE_STEPS) break;
  }
  return steps.sort((a, b) => a.order - b.order);
}

/**
 * Tạo MatterStage cho procedure từ mẫu mặc định `default-{procedureType}`.
 * Không có mẫu / mẫu rỗng → trả 0 (không lỗi, không chặn tạo thủ tục).
 */
export async function seedStagesFromTemplate(
  client: StageSeedClient,
  procedureId: string,
  procedureType: ProcedureType
): Promise<number> {
  const template = await client.stageTemplate.findUnique({
    where: { id: `default-${procedureType}` }
  });
  if (!template) return 0;
  const steps = normalizeStageSteps(template.steps);
  if (steps.length === 0) return 0;
  const result = await client.matterStage.createMany({
    data: steps.map((s) => ({ procedureId, name: s.name, order: s.order }))
  });
  return result.count;
}
