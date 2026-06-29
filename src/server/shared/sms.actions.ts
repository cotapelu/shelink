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
