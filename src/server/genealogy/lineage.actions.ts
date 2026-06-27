'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function listLineages(query?: { rootPersonId?: string; personId?: string; generation?: number }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const where: any = {};
  if (query?.rootPersonId) where.rootPersonId = query.rootPersonId;
  if (query?.personId) where.personId = query.personId;
  if (query?.generation) where.generation = query.generation;

  const lineages = await prisma.lineage.findMany({
    where,
    include: {
      person: true,
      rootPerson: true,
    },
    orderBy: { generation: 'asc' },
  });

  return lineages;
}

export async function getLineage(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const lineage = await prisma.lineage.findUnique({
    where: { id },
    include: {
      person: true,
      rootPerson: true,
    },
  });

  if (!lineage) throw new Error('Lineage not found');
  return lineage;
}

export async function createLineage(input: { personId: string; rootPersonId: string; generation: number; path: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const lineage = await prisma.lineage.create({
    data: input as any,
  });

  return lineage;
}

export async function updateLineage(id: string, input: Partial<{ generation: number; path: string }>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const lineage = await prisma.lineage.update({
    where: { id },
    data: input as any,
  });

  return lineage;
}

export async function deleteLineage(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  await prisma.lineage.delete({ where: { id } });
  revalidatePath('/genealogy/lineage');
  return { ok: true };
}
