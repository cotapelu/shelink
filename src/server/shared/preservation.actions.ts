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

export async function createPreservation(input: { matterId?: string; respondent?: string; type?: string; propertyType?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const preservation = await prisma.preservation.create({
    data: {
      matterId: input.matterId || null,
      respondent: input.respondent || '',
      type: input.type as any || 'PROPERTY',
      propertyType: input.propertyType as any || 'REAL_ESTATE',
      amount: null,
      guaranteeType: null,
      appliedAt: new Date(),
      startDate: new Date(),
      duration: 30,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      remindDays: [30, 15, 7, 3, 1],
      status: 'ACTIVE',
      ownerId: session.user.id,
    } as any,
  });

  return preservation;
}

export async function listPreservations(activeOnly?: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const where: any = {};
  if (activeOnly) where.status = 'ACTIVE';

  const preservations = await prisma.preservation.findMany({
    where,
    orderBy: { expiryDate: 'asc' },
    include: {
      matter: { select: { id: true, title: true } },
      owner: { select: { id: true, name: true } },
    },
  });

  return preservations;
}

export async function getPreservation(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const preservation = await prisma.preservation.findUnique({
    where: { id },
    include: {
      matter: { select: { id: true, title: true } },
      owner: { select: { id: true, name: true } },
      renewals: true,
    },
  });

  if (!preservation) throw new Error('Preservation not found');
  return preservation;
}

export async function renewPreservation(id: string, extraDays?: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const preservation = await prisma.preservation.findUnique({ where: { id } });
  if (!preservation) throw new Error('Preservation not found');

  const newExpiry = new Date(preservation.expiryDate);
  newExpiry.setDate(newExpiry.getDate() + (extraDays || 30));

  const updated = await prisma.preservation.update({
    where: { id },
    data: {
      expiryDate: newExpiry,
      lastRenewedAt: new Date(),
      renewedById: session.user.id,
      status: 'RENEWED',
    } as any,
  });

  await prisma.preservationRenewal.create({
    data: {
      preservationId: id,
      renewedAt: new Date(),
      oldExpiryDate: preservation.expiryDate,
    } as any,
  });

  revalidatePath('/preservations');
  return updated;
}

export async function closePreservation(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const updated = await prisma.preservation.update({
    where: { id },
    data: {
      status: 'LIFTED',
      closedAt: new Date(),
    } as any,
  });

  revalidatePath('/preservations');
  return updated;
}
