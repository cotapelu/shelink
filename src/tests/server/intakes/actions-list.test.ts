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
