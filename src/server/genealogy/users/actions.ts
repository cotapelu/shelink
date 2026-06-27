'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export async function getUsers() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  // Only admin can list users
  if (session.user.role !== 'ADMIN' && session.user.role !== 'LAWYER') {
    throw new Error('Forbidden');
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return users.map(u => ({
    id: u.id,
    email: u.email,
    role: u.role,
    is_active: u.active,
    created_at: u.createdAt.toISOString(),
  }));
}
