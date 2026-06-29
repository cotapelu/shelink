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
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * v0.39: 原子生成客户编号 KH-{YYYY}-{4位流水}
 *
 * 计数器存在 SystemSetting，key 形如 `client-code-counter-2026`。
 * 与 matters/code-generator.ts 同款 Serializable 事务避免并发冲突。
 */
export async function generateClientCode(): Promise<string> {
  const year = new Date().getFullYear();
  const key = `client-code-counter-${year}`;

  const next = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.systemSetting.findUnique({ where: { key } });
      const current = (existing?.value as { value?: number })?.value ?? 0;
      const incremented = current + 1;
      await tx.systemSetting.upsert({
        where: { key },
        update: { value: { value: incremented } },
        create: { key, value: { value: incremented } }
      });
      return incremented;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  const padded = String(next).padStart(4, "0");
  return `KH-${year}-${padded}`;
}
