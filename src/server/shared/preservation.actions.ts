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
