'use server'

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

export async function deleteMemberProfile(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  // Delete person (cascade relationships)
  await prisma.person.delete({ where: { id } });

  revalidatePath('/genealogy/persons');
  return { ok: true };
}
