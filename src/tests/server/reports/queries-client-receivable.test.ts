/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getReportData, type ReportPeriod } from '@/server/reports/queries';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    matter: {
      count: vi.fn(),
      groupBy: vi.fn()
    },
    feeEntry: {
      findMany: vi.fn()
    },
    user: {
      findMany: vi.fn()
    }
  }
}));

describe('getReportData - client receivable aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates client receivable correctly with mixed types', async () => {
    const period: ReportPeriod = {
      label: 'Test',
      start: new Date('2024-01-01'),
      end: new Date('2024-02-01')
    };

    // KPIs: all zero
    (prisma.matter.count as any).mockResolvedValue(0);
    (prisma.matter.groupBy as any).mockResolvedValue([]);
    (prisma.feeEntry.findMany as any).mockResolvedValue([
      // Client A: one receivable, one received
      {
        type: 'RECEIVABLE',
        amount: 5000,
        matter: { primaryClient: { id: 'c1', name: 'Client A' } }
      },
      {
        type: 'RECEIVED',
        amount: 3000,
        matter: { primaryClient: { id: 'c1', name: 'Client A' } }
      },
      // Client B: only receivable
      {
        type: 'RECEIVABLE',
        amount: 10000,
        matter: { primaryClient: { id: 'c2', name: 'Client B' } }
      },
      // Client C: null primaryClient (should skip)
      {
        type: 'RECEIVED',
        amount: 2000,
        matter: { primaryClient: null }
      },
      // Client D: missing matter (should skip)
      {
        type: 'RECEIVABLE',
        amount: 4000,
        matter: undefined
      }
    ]);
    (prisma.user.findMany as any).mockResolvedValue([]);

    const result = await getReportData(period);

    expect(result.byClientReceivable).toHaveLength(2);
    // Client A: receivable 5000, received 3000, balance 2000
    // Client B: receivable 10000, received 0, balance 10000
    const clientA = result.byClientReceivable.find(c => c.clientId === 'c1')!;
    const clientB = result.byClientReceivable.find(c => c.clientId === 'c2')!;

    expect(clientA.name).toBe('Client A');
    expect(clientA.receivable).toBe(5000);
    expect(clientA.received).toBe(3000);
    expect(clientA.balance).toBe(2000);

    expect(clientB.name).toBe('Client B');
    expect(clientB.receivable).toBe(10000);
    expect(clientB.received).toBe(0);
    expect(clientB.balance).toBe(10000);

    // Sorted by balance descending: B (10000) then A (2000)
    expect(result.byClientReceivable[0].clientId).toBe('c2');
    expect(result.byClientReceivable[1].clientId).toBe('c1');
  });

  it('handles empty fee entries', async () => {
    (prisma.matter.count as any).mockResolvedValue(0);
    (prisma.matter.groupBy as any).mockResolvedValue([]);
    (prisma.feeEntry.findMany as any).mockResolvedValue([]);
    (prisma.user.findMany as any).mockResolvedValue([]);

    const result = await getReportData({
      label: 'Empty',
      start: new Date('2024-01-01'),
      end: new Date('2024-02-01')
    });

    expect(result.byClientReceivable).toEqual([]);
  });
});
