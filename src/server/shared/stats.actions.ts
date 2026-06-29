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

export async function getDashboardStats() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const [
    totalMatters,
    activeMatters,
    totalTasks,
    pendingTasks,
    totalClients,
    totalFeeEntries,
    overdueFeeEntries,
    totalRevenue,
  ] = await Promise.all([
    prisma.matter.count(),
    prisma.matter.count({ where: { status: { in: ['IN_PROGRESS', 'PENDING_ACCEPTANCE'] } } }),
    prisma.workTask.count(),
    prisma.workTask.count({ where: { status: { in: ['TODO', 'IN_PROGRESS', 'REVIEW'] } } }),
    prisma.client.count(),
    prisma.feeEntry.count(),
    prisma.feeEntry.count({ where: { status: 'UNPAID', dueDate: { lt: new Date() } } as any }),
    prisma.feeEntry
      .aggregate({
        where: { status: 'PAID' } as any,
        _sum: { amount: true },
      })
      .then(res => (res._sum.amount as any) || 0),
  ]);

  return {
    totalMatters,
    activeMatters,
    totalTasks,
    pendingTasks,
    totalClients,
    totalFeeEntries,
    overdueFeeEntries,
    totalRevenue,
  };
}

export async function getGenealogyStats() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const [
    totalPersons,
    totalRelationships,
    totalEvents,
    totalLineages,
  ] = await Promise.all([
    prisma.person.count(),
    prisma.relationship.count(),
    prisma.event.count(),
    prisma.lineage.count(),
  ]);

  return {
    totalPersons,
    totalRelationships,
    totalEvents,
    totalLineages,
  };
}

// Temporarily disabled due to type issues
// export async function getErpStats(projectId?: string) {
//   const session = await getServerSession(authOptions);
//   if (!session?.user) throw new Error('Unauthorized');
//
//   const where: any = {};
//   if (projectId) where.projectId = projectId;
//
//   const [
//     totalProjects,
//     activeProjects,
//     totalTasks,
//     completedTasks,
//     totalTaskHours,
//   ] = await Promise.all([
//     prisma.project.count(),
//     prisma.project.count({ where: { status: 'ACTIVE' } }),
//     prisma.workTask.count(where),
//     prisma.workTask.count({ ...where, status: 'DONE' }),
//     prisma.workTask
//       .aggregate({
//         where: where as any,
//         _sum: { hoursLogged: true },
//       })
//       .then(res => (res._sum.hoursLogged as any) || 0),
//   ]);
//
//   return {
//     totalProjects,
//     activeProjects,
//     totalTasks,
//     completedTasks,
//     totalTaskHours,
//   };
// }
