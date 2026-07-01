// @ts-nocheck - Test file with extensive mocking, skipping strict type checking
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import cuid from 'cuid';

// Pre-generated IDs for consistency in tests (using valid cuid)
const ID = {
  preservation: cuid(),
  matter: cuid(),
  user: cuid(),
  owner: cuid(),
};

import {
  listPreservations,
  getPreservation,
  listExpiringPreservations,
  createPreservation,
  updatePreservation,
  renewPreservation,
  liftPreservation,
  deletePreservation,
} from '@/server/preservations/actions';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { preservationCreateSchema, preservationUpdateSchema, preservationRenewSchema, preservationLiftSchema, preservationIdSchema } from '@/server/preservations/schemas';
import { audit } from '@/server/audit';
import { assertCanAssociateMatter } from '@/lib/permissions';
import { assertMatterWritable } from '@/lib/archive/guard';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    preservation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    preservationRenewal: {
      create: vi.fn(),
    },
    matter: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((ops) => Promise.all(ops)),
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

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Helper to create mock session
const mockSession = (overrides = {}) => ({
  user: { id: ID.user, role: 'LAWYER', avatar: null, ...overrides },
  expires: '2025-01-01T00:00:00.000Z',
});

// Helper to create mock preservation
const mockPreservation = (overrides = {}) => ({
  id: ID.preservation,
  matterId: ID.matter,
  ownerId: ID.user,
  status: 'ACTIVE',
  expiryDate: new Date('2025-12-31'),
  startDate: new Date('2025-01-01'),
  type: 'LITIGATION',
  propertyType: 'REAL_ESTATE',
  amount: new Prisma.Decimal(100000),
  respondent: 'Test Respondent',
  guaranteeType: 'GUARANTEE_LETTER',
  appliedAt: new Date('2025-01-01'),
  duration: 365,
  court: 'Test Court',
  rulingNumber: 'RUL-001',
  propertyDetail: 'Test Property',
  note: 'Test note',
  remindDays: [30, 15, 7, 3, 1],
  matter: { id: ID.matter, internalCode: 'INT-001', title: 'Test Matter' },
  owner: { id: ID.owner, name: 'Owner Name' },
  renewals: [],
  ...overrides,
});

describe('listPreservations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return list of preservations with include', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);

    const mockData = [mockPreservation()];
    vi.mocked(prisma.preservation.findMany).mockResolvedValue(mockData);

    const result = await listPreservations();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(ID.preservation);
    expect(prisma.preservation.findMany).toHaveBeenCalledTimes(1);
  });

  it('should filter by status when provided', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);
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

  it('should filter by matterId when provided', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);
    vi.mocked(prisma.preservation.findMany).mockResolvedValue([]);

    await listPreservations({ matterId: ID.matter });

    expect(prisma.preservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          matterId: ID.matter,
        }),
      })
    );
  });

  it('should apply search across multiple fields', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);
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

  it('should combine status, matterId, and search filters', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);
    vi.mocked(prisma.preservation.findMany).mockResolvedValue([]);

    await listPreservations({ status: 'ACTIVE', matterId: ID.matter, search: 'foo' });

    expect(prisma.preservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
          matterId: ID.matter,
          AND: expect.any(Array),
        }),
      })
    );
  });
});

describe('getPreservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return preservation with includes when authorized', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);

    vi.mocked(prisma.preservation.findUnique)
      .mockResolvedValueOnce({ id: ID.preservation, matterId: ID.matter, ownerId: ID.user }) // permission check
      .mockResolvedValueOnce(mockPreservation()); // actual fetch

    const result = await getPreservation(ID.preservation);

    expect(result).toEqual(mockPreservation());
    expect(prisma.preservation.findUnique).toHaveBeenCalledTimes(2);
  });

  it('should throw when preservation not found', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);
    vi.mocked(prisma.preservation.findUnique).mockResolvedValue(null);

    await expect(getPreservation(ID.preservation)).rejects.toThrow('保全记录不存在');
  });

  it('should throw when access denied (record belongs to other owner)', async () => {
    const session = mockSession(); // user = ID.user
    vi.mocked(requireSession).mockResolvedValue(session);

    vi.mocked(prisma.preservation.findUnique)
      .mockResolvedValueOnce({ id: ID.preservation, matterId: null, ownerId: ID.owner }) // permission check fails
      .mockResolvedValueOnce(mockPreservation()); // second call won't happen

    await expect(getPreservation(ID.preservation)).rejects.toThrow('无权操作此保全记录');
  });
});

describe('listExpiringPreservations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list expiring preservations within days', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);

    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + 60);

    const mockData = [mockPreservation({ expiryDate: future })];
    vi.mocked(prisma.preservation.findMany).mockResolvedValue(mockData);

    const result = await listExpiringPreservations(60);

    expect(result).toHaveLength(1);
    expect(prisma.preservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['ACTIVE', 'RENEWED'] },
          expiryDate: { lte: future },
        }),
      })
    );
  });

  it('should use default 60 days when no argument', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);
    vi.mocked(prisma.preservation.findMany).mockResolvedValue([]);

    await listExpiringPreservations();

    expect(prisma.preservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          expiryDate: expect.any(Object),
        }),
      })
    );
  });
});

describe('createPreservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validInput = {
    type: 'LITIGATION',
    propertyType: 'REAL_ESTATE',
    amount: 100000,
    respondent: 'Test Respondent',
    startDate: new Date('2025-01-01'),
    duration: 365,
    expiryDate: new Date('2026-01-01'),
    remindDays: [30, 15, 7, 3, 1],
    guaranteeType: 'GUARANTEE_LETTER',
  };

  it('should create preservation successfully', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);

    const mockCreated = { id: 'new-pres', matterId: ID.matter };
    vi.mocked(prisma.preservation.create).mockResolvedValue(mockCreated as any);

    const result = await createPreservation(validInput);

    expect(result).toEqual({ ok: true, id: 'new-pres' });
    expect(prisma.preservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ACTIVE',
          amount: expect.any(Object), // Prisma.Decimal
        }),
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/preservation');
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PRESERVATION_CREATE',
        targetType: 'Preservation',
      })
    );
  });

  it('should throw when expiryDate <= startDate', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);

    const invalidInput = {
      ...validInput,
      expiryDate: new Date('2024-12-31'), // before startDate
    };

    await expect(createPreservation(invalidInput)).rejects.toThrow('到期日期必须晚于生效日期');
  });

  it('should throw when matterId not found', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);
    vi.mocked(prisma.matter.findUnique).mockResolvedValue(null);

    const inputWithMatter = { ...validInput, matterId: ID.preservation };

    await expect(createPreservation(inputWithMatter)).rejects.toThrow('关联案件不存在');
  });

  it('should call assertCanAssociateMatter when matterId provided', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);
    vi.mocked(prisma.matter.findUnique).mockResolvedValue({ id: ID.matter } as any);
    vi.mocked(prisma.preservation.create).mockResolvedValue({ id: 'new-pres', matterId: ID.matter } as any);

    await createPreservation({ ...validInput, matterId: ID.matter });

    expect(assertCanAssociateMatter).toHaveBeenCalledWith(ID.user, ID.matter);
    expect(assertMatterWritable).toHaveBeenCalledWith(ID.matter);
  });

  it('should handle null optional fields', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);
    vi.mocked(prisma.preservation.create).mockResolvedValue({ id: 'new-pres', matterId: null } as any);

    const input = {
      ...validInput,
      guaranteeType: null,
      appliedAt: null,
      court: '',
      rulingNumber: '',
      propertyDetail: '',
      note: '',
      ownerId: null,
      matterId: null,
    };

    const result = await createPreservation(input);

    expect(result).toEqual({ ok: true, id: 'new-pres' });
  });
});

describe('updatePreservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update preservation successfully', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);

    const existing = mockPreservation({ id: ID.preservation });
    vi.mocked(prisma.preservation.findUnique).mockResolvedValue(existing as any);
    vi.mocked(prisma.preservation.update).mockResolvedValue(existing as any);

    const updateData = {
      id: ID.preservation,
      amount: 200000,
      note: 'Updated note',
    };

    const result = await updatePreservation(updateData);

    expect(result).toEqual({ ok: true });
    expect(prisma.preservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ID.preservation },
        data: expect.objectContaining({
          amount: expect.any(Object),
          note: 'Updated note',
        }),
      })
    );
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PRESERVATION_UPDATE',
        targetId: ID.preservation,
      })
    );
  });

  it('should throw when preservation not found', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);
    vi.mocked(prisma.preservation.findUnique).mockResolvedValue(null);

    await expect(updatePreservation({ id: ID.preservation })).rejects.toThrow('保全记录不存在');
  });

  it('should validate date order when both dates provided', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);

    const existing = mockPreservation({ startDate: new Date('2025-01-01'), expiryDate: new Date('2025-12-31') });
    vi.mocked(prisma.preservation.findUnique).mockResolvedValue(existing as any);

    const updateData = {
      id: ID.preservation,
      startDate: new Date('2025-06-01'),
      expiryDate: new Date('2025-05-01'), // before startDate
    };

    await expect(updatePreservation(updateData)).rejects.toThrow('到期日期必须晚于生效日期');
  });

  it('should disconnect matter when matterId is null', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);

    const existing = mockPreservation({ matterId: ID.matter });
    vi.mocked(prisma.preservation.findUnique).mockResolvedValue(existing as any);
    vi.mocked(prisma.preservation.update).mockResolvedValue(existing as any);

    await updatePreservation({ id: ID.preservation, matterId: null });

    expect(prisma.preservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          matter: { disconnect: true },
        }),
      })
    );
  });
});

describe('renewPreservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should renew preservation successfully', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);

    const oldExpiry = new Date('2025-06-30');
    const pres = mockPreservation({ expiryDate: oldExpiry });
    vi.mocked(prisma.preservation.findUnique).mockResolvedValue(pres as any);
    vi.mocked(prisma.preservation.update).mockResolvedValue(pres as any);
    vi.mocked(prisma.preservationRenewal.create).mockResolvedValue({} as any);

    const newExpiry = new Date('2026-06-30');
    const result = await renewPreservation({
      id: ID.preservation,
      newExpiryDate: newExpiry,
      renewalDuration: 365,
    });

    expect(result).toEqual({ ok: true });
    // Check individual calls since $transaction uses Prisma.Deferrable
    expect(prisma.preservationRenewal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          preservationId: ID.preservation,
          oldExpiryDate: oldExpiry,
          newExpiryDate: newExpiry,
          renewalDuration: 365,
        }),
      })
    );
    expect(prisma.preservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ID.preservation },
        data: { expiryDate: newExpiry, status: 'RENEWED' },
      })
    );
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PRESERVATION_RENEW',
        targetId: ID.preservation,
      })
    );
  });

  it('should throw when preservation not found', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);
    vi.mocked(prisma.preservation.findUnique).mockResolvedValue(null);

    await expect(renewPreservation({ id: ID.preservation, newExpiryDate: new Date(), renewalDuration: 30 })).rejects.toThrow('保全记录不存在');
  });

  it('should throw when status is LIFTED', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);

    const pres = mockPreservation({ status: 'LIFTED' });
    vi.mocked(prisma.preservation.findUnique).mockResolvedValue(pres as any);

    await expect(renewPreservation({ id: ID.preservation, newExpiryDate: new Date(), renewalDuration: 30 })).rejects.toThrow('已解除的保全不可续保');
  });

  it('should throw when newExpiryDate <= old expiryDate', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);

    const pres = mockPreservation({ expiryDate: new Date('2025-12-31') });
    vi.mocked(prisma.preservation.findUnique).mockResolvedValue(pres as any);

    await expect(
      renewPreservation({
        id: ID.preservation,
        newExpiryDate: new Date('2025-06-30'), // before
        renewalDuration: 30,
      })
    ).rejects.toThrow('新到期日必须晚于原到期日');
  });
});

describe('liftPreservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should lift preservation successfully', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);

    const pres = mockPreservation({ note: 'Original note' });
    vi.mocked(prisma.preservation.findUnique).mockResolvedValue(pres as any);
    vi.mocked(prisma.preservation.update).mockResolvedValue(pres as any);

    const result = await liftPreservation({ id: ID.preservation, note: 'Lifted reason' });

    expect(result).toEqual({ ok: true });
    expect(prisma.preservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ID.preservation },
        data: {
          status: 'LIFTED',
          note: `Original note\n【解除】Lifted reason`,
        },
      })
    );
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PRESERVATION_LIFT',
      })
    );
  });

  it('should lift preservation without additional note', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);

    const pres = mockPreservation({ note: null });
    vi.mocked(prisma.preservation.findUnique).mockResolvedValue(pres as any);
    vi.mocked(prisma.preservation.update).mockResolvedValue(pres as any);

    await liftPreservation({ id: ID.preservation });

    expect(prisma.preservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'LIFTED', note: null },
      })
    );
  });

  it('should throw when preservation not found', async () => {
    const session = mockSession();
    vi.mocked(requireSession).mockResolvedValue(session);
    vi.mocked(prisma.preservation.findUnique).mockResolvedValue(null);

    await expect(liftPreservation({ id: ID.preservation })).rejects.toThrow('保全记录不存在');
  });
});

describe('deletePreservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete preservation successfully for ADMIN', async () => {
    const session = mockSession({ role: 'ADMIN' });
    vi.mocked(requireSession).mockResolvedValue(session);

    const pres = mockPreservation();
    vi.mocked(prisma.preservation.findUnique).mockResolvedValue(pres as any);
    vi.mocked(prisma.preservation.delete).mockResolvedValue(pres as any);

    const result = await deletePreservation({ id: ID.preservation });

    expect(result).toEqual({ ok: true });
    expect(prisma.preservation.delete).toHaveBeenCalledWith({ where: { id: ID.preservation } });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PRESERVATION_DELETE',
      })
    );
  });

  it('should delete preservation successfully for PRINCIPAL_LAWYER', async () => {
    const session = mockSession({ role: 'PRINCIPAL_LAWYER' });
    vi.mocked(requireSession).mockResolvedValue(session);

    const pres = mockPreservation();
    vi.mocked(prisma.preservation.findUnique).mockResolvedValue(pres as any);
    vi.mocked(prisma.preservation.delete).mockResolvedValue(pres as any);

    await deletePreservation({ id: ID.preservation });

    expect(prisma.preservation.delete).toHaveBeenCalled();
  });

  it('should throw for non-privileged roles', async () => {
    const session = mockSession({ role: 'LAWYER' });
    vi.mocked(requireSession).mockResolvedValue(session);

    await expect(deletePreservation({ id: ID.preservation })).rejects.toThrow('仅管理员或主任律师可删除保全记录');
  });

  it('should throw when preservation not found', async () => {
    const session = mockSession({ role: 'ADMIN' });
    vi.mocked(requireSession).mockResolvedValue(session);
    vi.mocked(prisma.preservation.findUnique).mockResolvedValue(null);

    await expect(deletePreservation({ id: ID.preservation })).rejects.toThrow('保全记录不存在');
  });
});
