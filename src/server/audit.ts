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

/**
 * 写一条审计日志。失败不抛错（业务流程不应被审计失败阻塞）。
 *
 * 用法：
 *   await audit({ userId, action: "CLIENT_CREATE", targetType: "Client", targetId, detail })
 */
export async function audit(params: {
  userId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        detail: params.detail as object | undefined,
        ip: params.ip,
        userAgent: params.userAgent
      }
    });
  } catch (err) {
    console.error("[audit] 写入失败：", err);
  }
}
