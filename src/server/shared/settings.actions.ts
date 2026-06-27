'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getSettings(keys?: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const where: any = {};
  if (keys?.length) where.key = { in: keys };

  const settings = await prisma.systemSetting.findMany({
    where,
    orderBy: { key: 'asc' },
  });

  return settings.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, any>);
}

export async function updateSetting(key: string, value: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const setting = await prisma.systemSetting.upsert({
    where: { key },
    update: {
      value,
      updatedAt: new Date(),
    },
    create: {
      key,
      value,
    },
  });

  revalidatePath('/admin/settings');
  return setting;
}
