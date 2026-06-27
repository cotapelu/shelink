'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function listReports() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const reports = await prisma.report.findMany({
    where: { generatedBy: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      generatedByUser: { select: { id: true, name: true } },
    },
  });

  return reports;
}

export async function getReport(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      generatedByUser: { select: { id: true, name: true } },
    },
  });

  if (!report) throw new Error('Report not found');
  return report;
}

export async function generateReport(input: { type: string; config?: any }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const report = await prisma.report.create({
    data: {
      name: `Report ${new Date().toISOString()}`,
      type: input.type,
      config: input.config || null,
      generatedBy: session.user.id,
      fileUrl: null,
    } as any,
  });

  // TODO: actual generation logic (e.g., PDF, Excel) as background job

  return report;
}

export async function deleteReport(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  await prisma.report.delete({ where: { id } });
  revalidatePath('/reports');
  return { ok: true };
}
