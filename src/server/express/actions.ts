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
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanAssociateMatter, matterAssociationFilter } from "@/lib/permissions";
import { trackExpress, detectCompany } from "@/lib/express/track";
import {
  saveExpressSettings as saveSettings,
  readPublicExpressSettings
} from "@/lib/express/settings";
import {
  expressCreateSchema,
  expressListFilterSchema,
  expressIdSchema,
  expressSettingsSaveSchema
} from "./schemas";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 列表 / 查询
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function listExpress(input?: z.input<typeof expressListFilterSchema>) {
  const session = await requireSession();
  const filter = expressListFilterSchema.parse(input ?? {});

  const accessWhere: Prisma.ExpressTrackingWhereInput = {
    OR: [
      { matter: { deletedAt: null, ...matterAssociationFilter(session.user.id) } },
      { matterId: null, createdById: session.user.id }
    ]
  };
  const where: Prisma.ExpressTrackingWhereInput = { AND: [accessWhere] };
  if (filter.scope === "mine") where.createdById = session.user.id;
  if (filter.direction !== "ALL") where.direction = filter.direction;
  if (filter.matterId) where.matterId = filter.matterId;
  if (filter.search) {
    where.AND = [
      accessWhere,
      {
        OR: [
          { trackingNo: { contains: filter.search, mode: "insensitive" } },
          { purpose: { contains: filter.search, mode: "insensitive" } },
          { recipient: { contains: filter.search, mode: "insensitive" } },
          { matter: { internalCode: { contains: filter.search, mode: "insensitive" } } },
          { matter: { title: { contains: filter.search, mode: "insensitive" } } }
        ]
      }
    ];
  }

  return prisma.expressTracking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      matter: { select: { id: true, internalCode: true, title: true } },
      createdBy: { select: { id: true, name: true } }
    }
  });
}

export async function getExpress(id: string) {
  const session = await requireSession();
  await assertCanAccessExpressRecord(session.user.id, id);
  return prisma.expressTracking.findUnique({
    where: { id },
    include: {
      matter: { select: { id: true, internalCode: true, title: true } },
      createdBy: { select: { id: true, name: true } }
    }
  });
}

async function assertCanAccessExpressRecord(userId: string, id: string) {
  const record = await prisma.expressTracking.findUnique({
    where: { id },
    select: { id: true, matterId: true, createdById: true }
  });
  if (!record) throw new Error("快递记录不存在");
  if (record.matterId) {
    await assertCanAssociateMatter(userId, record.matterId);
    return record;
  }
  if (record.createdById !== userId) throw new Error("无权操作此快递记录");
  return record;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 创建 + 首次查询
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function createExpress(input: z.infer<typeof expressCreateSchema>) {
  const session = await requireSession();
  const data = expressCreateSchema.parse(input);

  // 自动识别公司（如未指定）
  let companyCode = data.companyCode?.trim() || null;
  if (!companyCode) companyCode = detectCompany(data.trackingNo);

  if (data.matterId) {
    const m = await prisma.matter.findUnique({
      where: { id: data.matterId },
      select: { id: true }
    });
    if (!m) throw new Error("关联案件不存在");
    await assertCanAssociateMatter(session.user.id, data.matterId);
    await assertMatterWritable(data.matterId);
  }

  // 先尝试一次跟踪（失败不阻塞）
  let lastState: string | null = null;
  let tracesJson: Prisma.InputJsonValue | undefined = undefined;
  let lastUpdateAt: Date | null = null;
  try {
    if (companyCode) {
      const r = await trackExpress({ trackingNo: data.trackingNo, companyCode });
      lastState = r.state;
      tracesJson = r.traces as unknown as Prisma.InputJsonValue;
      lastUpdateAt = new Date();
    }
  } catch {
    // 静默：用户可以稍后手动刷新
  }

  const created = await prisma.expressTracking.create({
    data: {
      trackingNo: data.trackingNo.trim(),
      companyCode,
      direction: data.direction,
      matterId: data.matterId ?? null,
      purpose: data.purpose.trim(),
      recipient: data.recipient?.trim() || null,
      recipientPhone: data.recipientPhone?.trim() || null,
      lastState,
      tracesJson,
      lastUpdateAt,
      createdById: session.user.id
    },
    select: { id: true, matterId: true }
  });

  await audit({
    userId: session.user.id,
    action: "EXPRESS_CREATE",
    targetType: "ExpressTracking",
    targetId: created.id,
    detail: { trackingNo: data.trackingNo, direction: data.direction }
  });

  revalidatePath("/express");
  if (created.matterId) revalidatePath(`/matters/${created.matterId}`);
  return { ok: true, id: created.id, firstState: lastState };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 刷新
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function refreshExpress(input: z.infer<typeof expressIdSchema>) {
  const session = await requireSession();
  const data = expressIdSchema.parse(input);

  await assertCanAccessExpressRecord(session.user.id, data.id);
  const e = await prisma.expressTracking.findUniqueOrThrow({
    where: { id: data.id },
    select: { id: true, trackingNo: true, companyCode: true, matterId: true }
  });

  const r = await trackExpress({
    trackingNo: e.trackingNo,
    companyCode: e.companyCode ?? undefined
  });

  await prisma.expressTracking.update({
    where: { id: data.id },
    data: {
      companyCode: r.companyName,
      lastState: r.state,
      tracesJson: r.traces as unknown as Prisma.InputJsonValue,
      lastUpdateAt: new Date()
    }
  });

  await audit({
    userId: session.user.id,
    action: "EXPRESS_REFRESH",
    targetType: "ExpressTracking",
    targetId: data.id,
    detail: { state: r.state, provider: r.provider }
  });

  revalidatePath("/express");
  if (e.matterId) revalidatePath(`/matters/${e.matterId}`);
  return { ok: true, state: r.state, provider: r.provider, traces: r.traces };
}

export async function deleteExpress(input: z.infer<typeof expressIdSchema>) {
  const session = await requireSession();
  const data = expressIdSchema.parse(input);

  const e = await assertCanAccessExpressRecord(session.user.id, data.id);

  await prisma.expressTracking.delete({ where: { id: data.id } });

  await audit({
    userId: session.user.id,
    action: "EXPRESS_DELETE",
    targetType: "ExpressTracking",
    targetId: data.id
  });

  revalidatePath("/express");
  if (e.matterId) revalidatePath(`/matters/${e.matterId}`);
  return { ok: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 配置（仅 ADMIN）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("仅管理员可修改快递接入配置");
  }
  return session;
}

export async function getExpressSettingsPublic() {
  await requireAdmin();
  return readPublicExpressSettings();
}

export async function saveExpressSettingsAction(input: z.infer<typeof expressSettingsSaveSchema>) {
  const session = await requireAdmin();
  const data = expressSettingsSaveSchema.parse(input);

  await saveSettings({
    kdniaoEbusinessId: data.kdniaoEbusinessId?.trim() || undefined,
    kdniaoAppKey: data.kdniaoAppKey?.trim() || undefined,
    kdniaoClearKey: data.kdniaoClearKey,
    kuaidi100Customer: data.kuaidi100Customer?.trim() || undefined,
    kuaidi100Key: data.kuaidi100Key?.trim() || undefined,
    kuaidi100ClearKey: data.kuaidi100ClearKey
  });

  await audit({
    userId: session.user.id,
    action: "EXPRESS_SETTINGS_SAVE",
    targetType: "SystemSetting",
    targetId: "expressSettings"
  });

  return { ok: true };
}
