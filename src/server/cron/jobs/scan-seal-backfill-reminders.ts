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
import { prisma } from "@/lib/prisma";
import { audit } from "@/server/audit";
import { createNotification } from "@/server/notifications/create";

const REMIND_INTERVAL_DAYS = 3;
const REMINDER_REF_TYPE = "SealBackfillReminder";

export type SealBackfillReminderScanResult = {
  scanned: number;
  notified: number;
  suppressed: number;
};

export async function scanSealBackfillReminders(): Promise<SealBackfillReminderScanResult> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - REMIND_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

  const seals = await prisma.sealRequest.findMany({
    where: {
      status: "APPROVED",
      stampedDocId: null,
      approvedAt: { lte: cutoff }
    },
    select: {
      id: true,
      code: true,
      documentTitle: true,
      requestedById: true,
      approvedAt: true,
      matter: { select: { id: true, internalCode: true, title: true } }
    },
    orderBy: { approvedAt: "asc" },
    take: 200
  });

  let notified = 0;
  let suppressed = 0;

  for (const seal of seals) {
    const recent = await prisma.notification.findFirst({
      where: {
        userId: seal.requestedById,
        refType: REMINDER_REF_TYPE,
        refId: seal.id,
        createdAt: { gte: cutoff }
      },
      select: { id: true }
    });

    if (recent) {
      suppressed++;
      continue;
    }

    const matterText = seal.matter
      ? `案件 ${seal.matter.internalCode}·${seal.matter.title}`
      : "未关联案件";

    await createNotification({
      userId: seal.requestedById,
      type: "SEAL_STATUS_CHANGE",
      priority: "HIGH",
      title: `请回填盖章件：${seal.code}`,
      content: `${seal.documentTitle} · ${matterText}`,
      href: `/approvals/seals?id=${seal.id}`,
      refType: REMINDER_REF_TYPE,
      refId: seal.id
    });
    notified++;
  }

  await audit({
    userId: null,
    action: "SEAL_BACKFILL_REMINDER_SCAN_CRON",
    targetType: "Report",
    targetId: "seal-backfill-reminder",
    detail: {
      scanned: seals.length,
      notified,
      suppressed,
      intervalDays: REMIND_INTERVAL_DAYS
    }
  });

  return { scanned: seals.length, notified, suppressed };
}
