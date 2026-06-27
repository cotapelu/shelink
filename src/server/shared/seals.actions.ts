'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function requestSeal(input: { title: string; purpose: string; documentIds: string[]; urgency?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const seal = await prisma.sealRequest.create({
    data: {
      code: `SEAL-${Date.now()}`,
      sealType: 'GENERAL',
      purpose: input.purpose,
      documentTitle: input.title,
      documentIds: input.documentIds,
      urgency: (input.urgency as any) || 'NORMAL',
      status: 'PENDING',
      requestedById: session.user.id,
    } as any,
  });

  return seal;
}

export async function listSealRequests(status?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const where: any = {};
  if (status) where.status = status;

  const requests = await prisma.sealRequest.findMany({
    where,
    orderBy: { requestedAt: 'desc' },
    include: {
      requestedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });

  return requests;
}

export async function getSealRequest(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const seal = await prisma.sealRequest.findUnique({
    where: { id },
    include: {
      requestedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });

  if (!seal) throw new Error('Seal request not found');
  return seal;
}

export async function approveSeal(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const updated = await prisma.sealRequest.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedById: session.user.id,
      approvedAt: new Date(),
    } as any,
  });

  revalidatePath('/seals');
  return updated;
}

export async function rejectSeal(id: string, reason: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const updated = await prisma.sealRequest.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectionReason: reason,
    } as any,
  });

  revalidatePath('/seals');
  return updated;
}

export async function stampSeal(id: string, stampedDocId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const updated = await prisma.sealRequest.update({
    where: { id },
    data: {
      status: 'STAMPED',
      stampedDocId,
      stampedAt: new Date(),
    } as any,
  });

  revalidatePath('/seals');
  return updated;
}
