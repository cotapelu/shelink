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
/**
 * AuditLog 保留策略：每天 03:00 删超过 N 天的旧记录。
 *
 * 默认 365 天；环境变量 AUDIT_RETENTION_DAYS 可覆盖（如设 90 = 3 个月）。
 * AuditLog 表无 FK 反向引用，安全 hard delete。
 */
import { prisma } from "@/lib/prisma";
import { audit } from "@/server/audit";

const DEFAULT_RETENTION_DAYS = 365;

export type AuditCleanupResult = {
  retentionDays: number;
  deleted: number;
  cutoffDate: string;
};

export async function runAuditCleanup(): Promise<AuditCleanupResult> {
  const envDays = Number(process.env.AUDIT_RETENTION_DAYS);
  const retentionDays =
    Number.isFinite(envDays) && envDays > 0 ? envDays : DEFAULT_RETENTION_DAYS;
  const cutoff = new Date(Date.now() - retentionDays * 86400_000);

  const { count } = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } }
  });

  // 自己写一条 audit 留痕（这条 365 天后又会被自己删，但短期内可查）
  await audit({
    userId: null,
    action: "AUDIT_CLEANUP_CRON",
    targetType: "AuditLog",
    targetId: "retention",
    detail: {
      retentionDays,
      cutoffDate: cutoff.toISOString().slice(0, 10),
      deleted: count
    }
  });

  return {
    retentionDays,
    deleted: count,
    cutoffDate: cutoff.toISOString().slice(0, 10)
  };
}
