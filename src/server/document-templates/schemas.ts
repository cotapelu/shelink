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

export const templateListFilterSchema = z.object({
  category: z
    .enum([
      "INTAKE",
      "RETAINER",
      "LITIGATION",
      "HEARING",
      "WORK_PRODUCT",
      "ARCHIVE",
      "CLOSING",
      "BLANK"
    ])
    .optional(),
  matterCategory: z
    .enum([
      "CIVIL_COMMERCIAL",
      "CRIMINAL",
      "ADMINISTRATIVE",
      "NON_LITIGATION",
      "LEGAL_COUNSEL",
      "SPECIAL_PROJECT"
    ])
    .optional(),
  onlyEnabled: z.boolean().default(true)
});

export const templateToggleSchema = z.object({
  id: z.string().cuid(),
  enabled: z.boolean()
});

/**
 * 渲染模板生成文书并归档（段 3 模板引擎实现）。
 * - matterId: 目标案件
 * - templateId: 选定模板
 * - folderId: 目标卷宗（可空 = 散件）
 * - overrides: 行内补全的变量（路径化键值，如 {"client.idNumber": "320..."})；行内补全会回写源表
 */
export const templateRenderSchema = z.object({
  matterId: z.string().cuid(),
  templateId: z.string().cuid(),
  folderId: z.string().cuid().nullable(),
  overrides: z.record(z.string()).default({})
});
