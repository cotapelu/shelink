'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function listIntakes(query?: { status?: string; ownerId?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const where: any = {};
  if (query?.status) where.status = query.status;
  if (query?.ownerId) where.ownerUserId = query.ownerId;

  const intakes = await prisma.intake.findMany({
    where,
    include: {
      ownerUser: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return intakes;
}

export async function getIntake(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const intake = await prisma.intake.findUnique({
    where: { id },
    include: {
      ownerUser: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      parties: true,
      documents: true,
    },
  });

  if (!intake) throw new Error('Intake not found');
  return intake;
}

export async function createIntake(input: { title: string; description?: string; contactName?: string; contactPhone?: string; category?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const intake = await prisma.intake.create({
    data: {
      title: input.title,
      description: input.description || null,
      contactName: input.contactName || null,
      contactPhone: input.contactPhone || null,
      category: input.category as any || 'CIVIL_COMMERCIAL',
      status: 'INTAKE',
      ownerUserId: session.user.id,
    } as any,
  });

  return intake;
}

export async function updateIntake(id: string, input: Partial<{ title: string; description: string; contactName: string; contactPhone: string; category: string }>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const intake = await prisma.intake.update({
    where: { id },
    data: input as any,
  });

  return intake;
}

export async function assignIntake(id: string, assigneeId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const intake = await prisma.intake.update({
    where: { id },
    data: {
      ownerUserId: assigneeId,
      status: 'PENDING_CONFIRMATION',
    } as any,
  });

  revalidatePath('/intakes');
  return intake;
}

export async function convertIntakeToMatter(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const intake = await prisma.intake.findUnique({ where: { id } });
  if (!intake) throw new Error('Intake not found');

  // Create Matter from intake
  const matter = await prisma.matter.create({
    data: {
      title: intake.title,
      description: intake.description || '',
      category: intake.category as any || 'CIVIL_COMMERCIAL',
      status: 'PENDING_ACCEPTANCE',
      intakeDate: new Date(),
      intake: { connect: { id: intake.id } },
    } as any,
  });

  await prisma.intake.update({
    where: { id },
    data: {
      status: 'CONVERTED',
      matter: { connect: { id: matter.id } },
    } as any,
  });

  revalidatePath('/dashboard');
  return matter;
}

export async function deleteIntake(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  await prisma.intake.delete({ where: { id } });
  revalidatePath('/intakes');
  return { ok: true };
}
