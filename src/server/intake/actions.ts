/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
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
