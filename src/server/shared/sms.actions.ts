'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function sendSms(input: { to: string; content: string; matterId?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const message = await prisma.smsMessage.create({
    data: {
      to: input.to,
      content: input.content,
      status: 'SENT',
      sentAt: new Date(),
      sentById: session.user.id,
      matterId: input.matterId || null,
    } as any,
  });

  return message;
}

export async function listSmsMessages(matterId?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const where: any = {};
  if (matterId) where.matterId = matterId;

  const messages = await prisma.smsMessage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return messages;
}
