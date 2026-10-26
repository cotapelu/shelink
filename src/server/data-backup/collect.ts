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

import { prisma } from "@/lib/prisma";
import {
  BACKUP_RECORD_CAP,
  BACKUP_SPECIAL_SELECTS,
  getBackupModelNames,
  type BackupCounts,
  type BackupScope
} from "./snapshot";

type FindManyArgs = { take?: number; select?: Record<string, boolean> };
type Delegate = { findMany: (args: FindManyArgs) => Promise<unknown[]> };
const db = prisma as unknown as Record<string, Delegate | undefined>;

export type BackupDataset = {
  sections: Record<string, unknown[]>;
  counts: BackupCounts;
};

/** Đọc từng model trong phạm vi (song song), có giới hạn + select an toàn cho model nhạy cảm. */
export async function collectBackupData(scope: BackupScope): Promise<BackupDataset> {
  const entries = await Promise.all(
    getBackupModelNames(scope).map(async (model) => {
      const delegate = db[model];
      if (!delegate) return null;
      const select = BACKUP_SPECIAL_SELECTS[model];
      const rows = await delegate.findMany({ take: BACKUP_RECORD_CAP, ...(select ? { select } : {}) });
      return [model, rows] as const;
    })
  );
  const sections: Record<string, unknown[]> = {};
  const counts: BackupCounts = {};
  for (const entry of entries) {
    if (!entry) continue;
    sections[entry[0]] = entry[1];
    counts[entry[0]] = entry[1].length;
  }
  return { sections, counts };
}
