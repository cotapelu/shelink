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
'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createExpressTracking(input: { trackingNumber: string; carrier?: string; matterId?: string; purpose?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const tracking = await prisma.expressTracking.create({
    data: {
      trackingNo: input.trackingNumber,
      companyCode: input.carrier || null,
      matterId: input.matterId || null,
      direction: 'OUTBOUND',
      purpose: input.purpose || 'GENERAL',
      lastState: 'CREATED',
      createdById: session.user.id,
    } as any,
  });

  return tracking;
}

export async function listExpressTrackings(status?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const where: any = {};
  if (status) where.lastState = status;

  const trackings = await prisma.expressTracking.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      matter: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return trackings;
}

export async function updateExpressStatus(id: string, status: string, location?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const updated = await prisma.expressTracking.update({
    where: { id },
    data: {
      lastState: status,
      lastUpdateAt: new Date(),
      tracesJson: location ? { lastLocation: location, updatedAt: new Date() } : undefined,
    } as any,
  });

  revalidatePath('/express');
  return updated;
}
