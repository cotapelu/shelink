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
 * v0.39: Sinh mã khách hàng atomic KH-{YYYY}-{số thứ tự 4 chữ số}
 *
 * Bộ đếm lưu ở SystemSetting, key dạng `client-code-counter-2026`.
 * Cùng cơ chế transaction Serializable với matters/code-generator.ts để tránh xung đột đồng thời.
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
