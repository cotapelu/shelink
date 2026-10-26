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
 * (DATA-MODEL §4.13 StageTemplate → §4.8 MatterStage), KÈM nhiệm vụ mặc định (LegalTask §4.8)
 * theo `defaultTasks` của từng bước. Mẫu cấu hình ở /settings/templates; tài liệu UI đã ghi
 * "chỉ ảnh hưởng thủ tục mới tạo" — đây là phần áp dụng cho giai đoạn + nhiệm vụ mặc định.
 */

import type { ProcedureType } from "@prisma/client";

/** Giới hạn an toàn tránh dữ liệu cũ/hỏng gây phình bất thờ. */
export const MAX_TEMPLATE_STEPS = 50;
const MAX_STEP_NAME = 40;
const MAX_TASK_TITLE = 120;
const MAX_TASKS_PER_STEP = 20;
const MAX_TOTAL_TASKS = 200;

export type TemplateStep = { name: string; order: number; defaultTasks?: string[] };

type StageRow = { id: string; name: string; order: number };
type LegalTaskDelegate = {
  createMany: (args: {
    data: Array<{ matterId: string; stageId: string; title: string }>;
  }) => Promise<{ count: number }>;
};

/** Client tối thiểu cần dùng — tương thích cả `prisma` lẫn transaction client. */
type StageSeedClient = {
  stageTemplate: {
    findUnique: (args: { where: { id: string } }) => Promise<{ steps: unknown } | null>;
  };
  matterStage: {
    createMany: (args: {
      data: Array<{ procedureId: string; name: string; order: number }>;
    }) => Promise<{ count: number }>;
    findMany?: (args: {
      where: { procedureId: string };
      orderBy: { order: "asc" };
      select: { id: true; name: true; order: true };
    }) => Promise<StageRow[]>;
  };
  // Bổ sung tuỳ chọn cho sinh nhiệm vụ mặc định (bỏ qua nếu client không có).
  matterProcedure?: {
    findUnique: (args: { where: { id: string }; select: { matterId: true } }) => Promise<{ matterId: string } | null>;
  };
  legalTask?: LegalTaskDelegate;
};

/** Đọc `defaultTasks` (Json) → các tiêu đề nhiệm vụ sạch, giới hạn số lượng + độ dài. */
function parseDefaultTasks(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const tasks: string[] = [];
  for (const item of raw) {
    if (tasks.length >= MAX_TASKS_PER_STEP) break;
    if (typeof item !== "string") continue;
    const clean = item.trim().slice(0, MAX_TASK_TITLE);
    if (clean) tasks.push(clean);
  }
  return tasks;
}

/** Một mục `steps` → TemplateStep hợp lệ; null nếu thiếu tên/không phải object. */
function toTemplateStep(item: unknown, fallbackOrder: number): TemplateStep | null {
  if (!item || typeof item !== "object") return null;
  const { name, order, defaultTasks } = item as { name?: unknown; order?: unknown; defaultTasks?: unknown };
  const cleanName = typeof name === "string" ? name.trim().slice(0, MAX_STEP_NAME) : "";
  if (!cleanName) return null;
  const cleanOrder =
    typeof order === "number" && Number.isFinite(order) ? Math.max(1, Math.floor(order)) : fallbackOrder;
  const tasks = parseDefaultTasks(defaultTasks);
  return tasks.length > 0 ? { name: cleanName, order: cleanOrder, defaultTasks: tasks } : { name: cleanName, order: cleanOrder };
}

/**
 * Chuẩn hoá `steps` (Json) của StageTemplate thành danh sách giai đoạn hợp lệ.
 * Thuần, bền vững: bỏ mục không phải object/thiếu tên, cắt tên, ghép order, sắp xếp, chặn 50.
 * `defaultTasks` chỉ đính kèm khi thực sự có nhiệm vụ (tương thích kỳ vọng cũ).
 */
export function normalizeStageSteps(raw: unknown): TemplateStep[] {
  if (!Array.isArray(raw)) return [];
  const steps: TemplateStep[] = [];
  for (const item of raw) {
    const step = toTemplateStep(item, steps.length + 1);
    if (step) steps.push(step);
    if (steps.length >= MAX_TEMPLATE_STEPS) break;
  }
  return steps.sort((a, b) => a.order - b.order);
}

/**
 * Tạo MatterStage cho procedure từ mẫu mặc định `default-{procedureType}`, kèm nhiệm vụ
 * mặc định (LegalTask) theo từng giai đoạn nếu mẫu có `defaultTasks`.
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
  await seedTasksForStages(client, procedureId, steps);
  return result.count;
}

type TaskSeedContext = {
  matterId: string;
  stageNameToId: Map<string, string>;
  legalTask: LegalTaskDelegate;
};

/** Lấy matterId + bản đồ tên-giai đoạn→id; null nếu client thiếu method / không đọc được. */
async function resolveTaskContext(
  client: StageSeedClient,
  procedureId: string
): Promise<TaskSeedContext | null> {
  if (!client.legalTask || !client.matterProcedure || !client.matterStage.findMany) return null;
  const procedure = await client.matterProcedure.findUnique({ where: { id: procedureId }, select: { matterId: true } });
  if (!procedure?.matterId) return null;
  const stageRows = await client.matterStage.findMany({
    where: { procedureId }, orderBy: { order: "asc" }, select: { id: true, name: true, order: true }
  });
  return {
    matterId: procedure.matterId,
    stageNameToId: new Map(stageRows.map((r) => [r.name, r.id])),
    legalTask: client.legalTask
  };
}

/** Lập danh sách LegalTask đầu vào từ các bước có defaultTasks, gắn theo giai đoạn (theo tên). */
function buildDefaultTaskRows(
  steps: TemplateStep[],
  ctx: TaskSeedContext
): Array<{ matterId: string; stageId: string; title: string }> {
  const data: Array<{ matterId: string; stageId: string; title: string }> = [];
  for (const step of steps) {
    const stageId = ctx.stageNameToId.get(step.name);
    if (!stageId) continue;
    for (const title of step.defaultTasks ?? []) {
      if (data.length >= MAX_TOTAL_TASKS) return data;
      data.push({ matterId: ctx.matterId, stageId, title });
    }
  }
  return data;
}

/** Sinh LegalTask mặc định theo giai đoạn; no-op khi không có task / thiếu context. Không bao giờ chặn. */
async function seedTasksForStages(
  client: StageSeedClient,
  procedureId: string,
  steps: TemplateStep[]
): Promise<void> {
  const withTasks = steps.filter((s) => (s.defaultTasks?.length ?? 0) > 0);
  if (withTasks.length === 0) return;
  const ctx = await resolveTaskContext(client, procedureId);
  if (!ctx) return;
  const data = buildDefaultTaskRows(withTasks, ctx);
  if (data.length > 0) await ctx.legalTask.createMany({ data });
}
