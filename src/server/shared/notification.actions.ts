'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function listNotifications(userId?: string, options?: { unreadOnly?: boolean; limit?: number }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const where: any = {};
  if (userId) where.userId = userId;
  else where.userId = session.user.id;
  if (options?.unreadOnly) where.read = false;

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  return notifications;
}

export async function getUnreadNotificationCount(userId?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const where: any = {};
  if (userId) where.userId = userId;
  else where.userId = session.user.id;
  where.read = false;

  const count = await prisma.notification.count({ where });
  return count;
}

export async function markNotificationRead(notificationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const notification = await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });

  revalidatePath('/dashboard');
  return notification;
}

export async function markAllNotificationsRead(userId?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const where: any = {};
  if (userId) where.userId = userId;
  else where.userId = session.user.id;
  where.read = false;

  await prisma.notification.updateMany({
    where,
    data: { read: true },
  });

  revalidatePath('/dashboard');
  return { ok: true };
}

export async function createNotification(input: { userId: string; type: string; title: string; message?: string; metadata?: any }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      metadata: input.metadata || null,
      read: false,
    } as any,
  });

  return notification;
}
