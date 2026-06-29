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
/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listIntakes } from '@/server/intakes/actions';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth/session';
import { intakeVisibilityFilter } from '@/lib/permissions';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    intake: {
      findMany: vi.fn(),
      count: vi.fn()
    }
  }
}));

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn()
}));

vi.mock('@/lib/permissions', () => ({
  intakeVisibilityFilter: vi.fn(() => ({}))
}));

const mockSession = { user: { id: 'u1', role: 'LAWYER' } };

describe('listIntakes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireSession as any).mockResolvedValue(mockSession);
    (intakeVisibilityFilter as any).mockReturnValue({});
  });

  it('returns paginated results with default sort', async () => {
    const mockItems = [
      { id: 'i1', title: 'Intake 1', receivedAt: new Date('2024-01-01') },
      { id: 'i2', title: 'Intake 2', receivedAt: new Date('2024-01-02') }
    ];
    (prisma.intake.findMany as any).mockResolvedValue(mockItems);
    (prisma.intake.count as any).mockResolvedValue(2);

    const result = await listIntakes({ page: 1, pageSize: 10 });

    expect(result.items).toEqual(mockItems);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(prisma.intake.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ AND: expect.any(Array) }),
        orderBy: [{ receivedAt: 'desc' }],
        skip: 0,
        take: 10,
        include: expect.any(Object)
      })
    );
  });

  it('applies status filter', async () => {
    (prisma.intake.findMany as any).mockResolvedValue([]);
    (prisma.intake.count as any).mockResolvedValue(0);

    await listIntakes({ status: 'PENDING_CONFIRMATION' });

    const whereArg = (prisma.intake.findMany as any).mock.calls[0][0].where;
    expect(whereArg.AND).toContainEqual({ status: 'PENDING_CONFIRMATION' });
  });

  it('applies statusIn filter', async () => {
    (prisma.intake.findMany as any).mockResolvedValue([]);
    (prisma.intake.count as any).mockResolvedValue(0);

    await listIntakes({ statusIn: ['PENDING_CONFIRMATION', 'DECLINED'] });

    const whereArg = (prisma.intake.findMany as any).mock.calls[0][0].where;
    expect(whereArg.AND).toContainEqual({ status: { in: ['PENDING_CONFIRMATION', 'DECLINED'] } });
  });

  it('applies category filter', async () => {
    (prisma.intake.findMany as any).mockResolvedValue([]);
    (prisma.intake.count as any).mockResolvedValue(0);

    await listIntakes({ category: 'CIVIL_COMMERCIAL' });

    const whereArg = (prisma.intake.findMany as any).mock.calls[0][0].where;
    expect(whereArg.AND).toContainEqual({ category: 'CIVIL_COMMERCIAL' });
  });

  it('applies date range filter', async () => {
    (prisma.intake.findMany as any).mockResolvedValue([]);
    (prisma.intake.count as any).mockResolvedValue(0);
    const from = new Date('2024-01-01');
    const to = new Date('2024-01-31');

    await listIntakes({ receivedAtFrom: from, receivedAtTo: to });

    const whereArg = (prisma.intake.findMany as any).mock.calls[0][0].where;
    expect(whereArg.AND).toContainEqual({
      receivedAt: { gte: from, lte: to }
    });
  });

  it('applies search filter across title, description, client name', async () => {
    (prisma.intake.findMany as any).mockResolvedValue([]);
    (prisma.intake.count as any).mockResolvedValue(0);

    await listIntakes({ search: 'test' });

    const whereArg = (prisma.intake.findMany as any).mock.calls[0][0].where;
    expect(whereArg.AND).toContainEqual({
      OR: [
        { title: { contains: 'test', mode: 'insensitive' } },
        { description: { contains: 'test', mode: 'insensitive' } },
        { client: { name: { contains: 'test', mode: 'insensitive' } } }
      ]
    });
  });

  it('applies custom sort by claimAmount', async () => {
    (prisma.intake.findMany as any).mockResolvedValue([]);
    (prisma.intake.count as any).mockResolvedValue(0);

    await listIntakes({ sortBy: 'claimAmount', sortDir: 'asc' });

    const orderByArg = (prisma.intake.findMany as any).mock.calls[0][0].orderBy;
    expect(orderByArg).toEqual([{ claimAmount: 'asc' }, { receivedAt: 'desc' }]);
  });

  it('includes correct relations', async () => {
    (prisma.intake.findMany as any).mockResolvedValue([]);
    (prisma.intake.count as any).mockResolvedValue(0);

    await listIntakes({});

    const includeArg = (prisma.intake.findMany as any).mock.calls[0][0].include;
    expect(includeArg.client).toEqual({ select: { id: true, name: true, type: true } });
    expect(includeArg.cause).toEqual({ select: { id: true, name: true } });
    expect(includeArg.conflictChecks).toEqual({
      orderBy: { checkedAt: 'desc' },
      take: 1,
      select: { id: true, conclusion: true, hits: { select: { severity: true } } }
    });
    expect(includeArg.parties).toEqual({
      where: { role: 'OPPOSING_PARTY' },
      select: { name: true }
    });
    expect(includeArg.matter).toEqual({ select: { id: true, internalCode: true } });
    expect(includeArg.ownerUser).toEqual({ select: { id: true, name: true } });
  });

  it('calculates skip correctly for page 2', async () => {
    (prisma.intake.findMany as any).mockResolvedValue([]);
    (prisma.intake.count as any).mockResolvedValue(0);

    await listIntakes({ page: 2, pageSize: 20 });

    const skipArg = (prisma.intake.findMany as any).mock.calls[0][0].skip;
    expect(skipArg).toBe(20); // (2-1)*20
  });

  it('handles empty result set', async () => {
    (prisma.intake.findMany as any).mockResolvedValue([]);
    (prisma.intake.count as any).mockResolvedValue(0);

    const result = await listIntakes({});

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});
