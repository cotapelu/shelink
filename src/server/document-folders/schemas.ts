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

export const folderCreateSchema = z.object({
  matterId: z.string().cuid(),
  name: z.string().min(1, "卷宗名必填").max(40, "卷宗名最长 40 字")
});

export const folderRenameSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(40)
});

export const folderDeleteSchema = z.object({
  id: z.string().cuid()
});

export const folderReorderSchema = z.object({
  matterId: z.string().cuid(),
  orderedIds: z.array(z.string().cuid()).min(1)
});

export const moveDocumentToFolderSchema = z.object({
  documentId: z.string().cuid(),
  folderId: z.string().cuid().nullable()
});
