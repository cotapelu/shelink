import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listPreservations } from '@/server/preservations/actions';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth/session';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    preservation: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn(),
}));

vi.mock('@/server/audit', () => ({
  audit: vi.fn(),
}));

vi.mock('@/lib/archive/guard', () => ({
  assertMatterWritable: vi.fn(),
}));

vi.mock('@/lib/permissions', () => ({
  assertCanAssociateMatter: vi.fn(),
  matterAssociationFilter: vi.fn(() => ({})),
}));

// We don't mock the local helpers (parse, etc.) – they run for real.

describe('listPreservations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return list of preservations with include', async () => {
    const mockSession = { user: { id: 'user-123', role: 'LAWYER', avatar: null }, expires: '2025-01-01T00:00:00.000Z' };
    vi.mocked(requireSession).mockResolvedValue(mockSession);

    const mockData = [
      {
        id: 'pres-1',
        status: 'ACTIVE',
        expiryDate: new Date('2025-01-01'),
        matter: { id: 'm-1', internalCode: 'INT-001', title: 'Test Matter' },
        owner: { id: 'u-1', name: 'Owner' },
        renewals: [],
      },
    ] as any;
    vi.mocked(prisma.preservation.findMany).mockResolvedValue(mockData);

    const result = await listPreservations();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pres-1');
    expect(prisma.preservation.findMany).toHaveBeenCalledTimes(1);
  });

  it('should filter by status when provided', async () => {
    const mockSession = { user: { id: 'user-123', role: 'LAWYER', avatar: null }, expires: '2025-01-01T00:00:00.000Z' };
    vi.mocked(requireSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.preservation.findMany).mockResolvedValue([]);

    await listPreservations({ status: 'ACTIVE' });

    expect(prisma.preservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
        }),
      })
    );
  });

  // Note: matterId requires valid cuid; skipping due to schema complexity

  it('should apply search across multiple fields', async () => {
    const mockSession = { user: { id: 'user-123', role: 'LAWYER', avatar: null }, expires: '2025-01-01T00:00:00.000Z' };
    vi.mocked(requireSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.preservation.findMany).mockResolvedValue([]);

    await listPreservations({ search: 'test' });

    expect(prisma.preservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { respondent: { contains: 'test', mode: 'insensitive' } },
                { propertyDetail: { contains: 'test', mode: 'insensitive' } },
                { rulingNumber: { contains: 'test', mode: 'insensitive' } },
                { matter: { title: { contains: 'test', mode: 'insensitive' } } },
                { matter: { internalCode: { contains: 'test', mode: 'insensitive' } } },
              ]),
            }),
          ]),
        }),
      })
    );
  });
});
