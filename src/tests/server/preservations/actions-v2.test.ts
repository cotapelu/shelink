/**
 * Test cho server action bảo toàn tài sản v2 (case/target/property) — AUTO-67c.
 * Mock Prisma + session + permissions; kiểm tra phân quyền, validate, transaction.
 */
// @ts-nocheck - Test file với mock rộng, bỏ strict type checking như pattern có sẵn
import { describe, it, expect, vi, beforeEach } from 'vitest';
import cuid from 'cuid';
import { Prisma } from '@prisma/client';

const ID = {
  case: cuid(),
  target: cuid(),
  property: cuid(),
  matter: cuid(),
  user: cuid(),
  other: cuid(),
  approver: cuid()
};

vi.mock('@/lib/prisma', () => ({
  prisma: {
    preservationCase: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    preservationTarget: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    preservationProperty: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    preservationPropertyRenewal: { create: vi.fn() },
    matter: { findUnique: vi.fn() },
    user: { findMany: vi.fn() },
    $transaction: vi.fn()
  }
}));
vi.mock('@/lib/auth/session', () => ({ requireSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/server/audit', () => ({ audit: vi.fn() }));
vi.mock('@/lib/permissions', () => ({
  assertCanAssociateMatter: vi.fn(),
  matterAssociationFilter: vi.fn(() => ({}))
}));
vi.mock('@/lib/archive/guard', () => ({ assertMatterWritable: vi.fn() }));

import {
  listPreservationCases,
  createPreservationCase,
  updatePreservationCase,
  deletePreservationCase
} from '@/server/preservations/preservation-case-actions';
import {
  addTarget,
  updateTarget,
  deleteTarget,
  addProperty,
  updateProperty,
  renewProperty,
  liftProperty,
  deleteProperty,
  listExpiringProperties
} from '@/server/preservations/preservation-property-actions';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth/session';
import { audit } from '@/server/audit';
import { assertCanAssociateMatter, matterAssociationFilter } from '@/lib/permissions';
import { assertMatterWritable } from '@/lib/archive/guard';

const session = (role = 'LAWYER', id = ID.user) => ({
  user: { id, role, name: 'Tester', avatar: null },
  expires: new Date(Date.now() + 3600000).toISOString()
});

const caseAccess = (over = {}) => ({ id: ID.case, matterId: null, ownerId: ID.user, ...over });

beforeEach(() => {
  vi.clearAllMocks();
  requireSession.mockResolvedValue(session());
});

describe('listPreservationCases', () => {
  it('trả về danh sách kèm include đầy đủ', async () => {
    prisma.preservationCase.findMany.mockResolvedValue([]);
    const rows = await listPreservationCases();
    expect(rows).toEqual([]);
    expect(prisma.preservationCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.any(Object) })
    );
  });

  it('chưa đăng nhập thì ném lỗi', async () => {
    requireSession.mockRejectedValue(new Error('Chưa đăng nhập'));
    await expect(listPreservationCases()).rejects.toThrow('Chưa đăng nhập');
  });
});

describe('createPreservationCase', () => {
  const input = {
    type: 'PRE_LITIGATION',
    remindDays: [30],
    firstTarget: 'Bên bị bảo toàn A',
    firstPropertyType: 'BANK_DEPOSIT',
    firstAmount: 1000
  };

  it('tạo case + target + property inline', async () => {
    prisma.preservationCase.create.mockResolvedValue({ id: ID.case, matterId: null });
    const res = await createPreservationCase(input);
    expect(res).toEqual({ ok: true, id: ID.case });
    const createArg = prisma.preservationCase.create.mock.calls[0][0];
    expect(createArg.data.targets.create.name).toBe('Bên bị bảo toàn A');
    expect(createArg.data.targets.create.properties.create.amount).toBeInstanceOf(Prisma.Decimal);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'PRESERVATION_CASE_CREATE' }));
  });

  it('không có firstTarget thì không tạo target', async () => {
    prisma.preservationCase.create.mockResolvedValue({ id: ID.case, matterId: null });
    await createPreservationCase({ type: 'PRE_LITIGATION', remindDays: [30] });
    const createArg = prisma.preservationCase.create.mock.calls[0][0];
    expect(createArg.data.targets).toBeUndefined();
  });

  it('matter không tồn tại thì chặn', async () => {
    prisma.matter.findUnique.mockResolvedValue(null);
    await expect(createPreservationCase({ ...input, matterId: ID.matter })).rejects.toThrow(
      'Vụ án liên kết không tồn tại'
    );
  });

  it('matter tồn tại thì check quyền + writable', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: ID.matter });
    prisma.preservationCase.create.mockResolvedValue({ id: ID.case, matterId: ID.matter });
    await createPreservationCase({ ...input, matterId: ID.matter });
    expect(assertCanAssociateMatter).toHaveBeenCalledWith(ID.user, ID.matter);
    expect(assertMatterWritable).toHaveBeenCalledWith(ID.matter);
  });
});

describe('updatePreservationCase', () => {
  it('case không tồn tại thì ném lỗi', async () => {
    prisma.preservationCase.findUnique.mockResolvedValue(null);
    await expect(updatePreservationCase({ id: ID.case, court: 'Toà' })).rejects.toThrow(
      'Vụ án bảo toàn không tồn tại'
    );
  });

  it('owner không khớp thì chặn', async () => {
    prisma.preservationCase.findUnique.mockResolvedValue(caseAccess({ ownerId: ID.other }));
    await expect(updatePreservationCase({ id: ID.case, court: 'x' })).rejects.toThrow(
      'Không có quyền thao tác bản ghi bảo toàn'
    );
  });

  it('owner khớp thì patch + audit', async () => {
    prisma.preservationCase.findUnique.mockResolvedValue(caseAccess());
    await updatePreservationCase({ id: ID.case, court: ' Toà ' });
    const patch = prisma.preservationCase.update.mock.calls[0][0].data;
    expect(patch.court).toBe('Toà');
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'PRESERVATION_CASE_UPDATE' }));
  });

  it('matterId null thì disconnect', async () => {
    prisma.preservationCase.findUnique.mockResolvedValue(caseAccess({ matterId: ID.matter }));
    await updatePreservationCase({ id: ID.case, matterId: null });
    const patch = prisma.preservationCase.update.mock.calls[0][0].data;
    expect(patch.matter).toEqual({ disconnect: true });
  });
});

describe('deletePreservationCase', () => {
  it('STAFF không được xoá', async () => {
    requireSession.mockResolvedValue(session('ASSISTANT'));
    await expect(deletePreservationCase({ id: ID.case })).rejects.toThrow(
      'Chỉ quản trị viên hoặc luật sư chính'
    );
  });

  it('ADMIN xoá được', async () => {
    requireSession.mockResolvedValue(session('ADMIN'));
    prisma.preservationCase.findUnique.mockResolvedValue(caseAccess());
    await deletePreservationCase({ id: ID.case });
    expect(prisma.preservationCase.delete).toHaveBeenCalledWith({ where: { id: ID.case } });
  });
});

describe('target actions', () => {
  const targetRow = { id: ID.target, caseId: ID.case, case: caseAccess() };

  it('addTarget tạo target', async () => {
    prisma.preservationTarget.findUnique.mockResolvedValue(targetRow);
    prisma.preservationTarget.create.mockResolvedValue({ id: ID.target });
    const res = await addTarget({ caseId: ID.case, name: ' Bên A ' });
    expect(res).toEqual({ ok: true, id: ID.target });
    expect(prisma.preservationTarget.create.mock.calls[0][0].data.name).toBe('Bên A');
  });

  it('addTarget case không tồn tại thì chặn', async () => {
    prisma.preservationTarget.findUnique.mockResolvedValue(null);
    await expect(addTarget({ caseId: ID.case, name: 'A' })).rejects.toThrow('Bên bị bảo toàn không tồn tại');
  });

  it('updateTarget patch name trim + note null', async () => {
    prisma.preservationTarget.findUnique.mockResolvedValue(targetRow);
    await updateTarget({ id: ID.target, name: ' A ', note: '' });
    const patch = prisma.preservationTarget.update.mock.calls[0][0].data;
    expect(patch.name).toBe('A');
    expect(patch.note).toBeNull();
  });

  it('deleteTarget xoá', async () => {
    prisma.preservationTarget.findUnique.mockResolvedValue(targetRow);
    await deleteTarget(ID.target);
    expect(prisma.preservationTarget.delete).toHaveBeenCalledWith({ where: { id: ID.target } });
  });
});

describe('property actions', () => {
  const propRow = {
    id: ID.property,
    status: 'ACTIVE',
    expiryDate: new Date('2026-06-01'),
    target: { id: ID.target, case: caseAccess() }
  };

  it('addProperty tạo property', async () => {
    prisma.preservationTarget.findUnique.mockResolvedValue({ id: ID.target, case: caseAccess() });
    prisma.preservationProperty.create.mockResolvedValue({ id: ID.property });
    const res = await addProperty({
      targetId: ID.target,
      propertyType: 'BANK_DEPOSIT',
      startDate: new Date('2026-01-01'),
      duration: 365,
      expiryDate: new Date('2026-12-31'),
      amount: 500
    });
    expect(res).toEqual({ ok: true, id: ID.property });
    expect(prisma.preservationProperty.create.mock.calls[0][0].data.status).toBe('ACTIVE');
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'PRESERVATION_PROPERTY_CREATE' }));
  });

  it('addProperty expiry <= start thì chặn', async () => {
    await expect(
      addProperty({
        targetId: ID.target,
        propertyType: 'BANK_DEPOSIT',
        startDate: new Date('2026-06-01'),
        duration: 365,
        expiryDate: new Date('2026-06-01')
      })
    ).rejects.toThrow('Ngày đến hạn phải sau ngày có hiệu lực');
  });

  it('updateProperty patch decimal + trim', async () => {
    prisma.preservationProperty.findUnique.mockResolvedValue(propRow);
    await updateProperty({ id: ID.property, amount: 999, propertyDetail: ' chi tiết ' });
    const patch = prisma.preservationProperty.update.mock.calls[0][0].data;
    expect(patch.amount).toBeInstanceOf(Prisma.Decimal);
    expect(patch.propertyDetail).toBe('chi tiết');
  });

  it('renewProperty tạo renewal + update trong transaction', async () => {
    prisma.preservationProperty.findUnique.mockResolvedValue(propRow);
    await renewProperty({ propertyId: ID.property, newExpiryDate: new Date('2027-01-01'), renewalDuration: 365 });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.preservationPropertyRenewal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ oldExpiryDate: propRow.expiryDate }) })
    );
  });

  it('renewProperty ngày mới <= ngày cũ thì chặn', async () => {
    prisma.preservationProperty.findUnique.mockResolvedValue(propRow);
    await expect(
      renewProperty({ propertyId: ID.property, newExpiryDate: new Date('2026-05-01'), renewalDuration: 365 })
    ).rejects.toThrow('Ngày đến hạn mới phải sau ngày đến hạn cũ');
  });

  it('renewProperty đã gỡ bỏ thì chặn', async () => {
    prisma.preservationProperty.findUnique.mockResolvedValue({ ...propRow, status: 'LIFTED' });
    await expect(
      renewProperty({ propertyId: ID.property, newExpiryDate: new Date('2027-01-01'), renewalDuration: 365 })
    ).rejects.toThrow('Bảo toàn đã gỡ bỏ');
  });

  it('liftProperty chuyển status LIFTED', async () => {
    prisma.preservationProperty.findUnique.mockResolvedValue(propRow);
    await liftProperty(ID.property);
    expect(prisma.preservationProperty.update).toHaveBeenCalledWith({
      where: { id: ID.property },
      data: { status: 'LIFTED' }
    });
  });

  it('deleteProperty xoá', async () => {
    prisma.preservationProperty.findUnique.mockResolvedValue(propRow);
    await deleteProperty(ID.property);
    expect(prisma.preservationProperty.delete).toHaveBeenCalledWith({ where: { id: ID.property } });
  });

  it('property không tồn tại thì chặn', async () => {
    prisma.preservationProperty.findUnique.mockResolvedValue(null);
    await expect(liftProperty(ID.property)).rejects.toThrow('Tài sản bảo toàn không tồn tại');
  });
});

describe('listExpiringProperties', () => {
  it('lọc theo ngày + trạng thái ACTIVE/RENEWED', async () => {
    prisma.preservationProperty.findMany.mockResolvedValue([]);
    await listExpiringProperties(30);
    const where = prisma.preservationProperty.findMany.mock.calls[0][0].where;
    expect(where.status.in).toEqual(['ACTIVE', 'RENEWED']);
    expect(matterAssociationFilter).toHaveBeenCalledWith(ID.user);
  });
});
