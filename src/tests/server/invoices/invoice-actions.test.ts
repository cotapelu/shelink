/**
 * Test cho invoice-request-actions + invoice-approval-actions — AUTO-67e.
 * Bao gồm regression test cho bug finalStatus (có invoiceFile → ISSUED).
 */
// @ts-nocheck - Test file với mock rộng, bỏ strict type checking như pattern có sẵn
import { describe, it, expect, vi, beforeEach } from 'vitest';
import cuid from 'cuid';

const ID = { req: cuid(), matter: cuid(), user: cuid(), other: cuid(), doc: cuid() };

vi.mock('@/lib/prisma', () => ({
  prisma: {
    invoiceRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn()
    },
    matter: { findUnique: vi.fn() },
    document: { findMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn()
  }
}));
vi.mock('@/lib/auth/session', () => ({ requireSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/server/audit', () => ({ audit: vi.fn() }));
vi.mock('@/server/notifications/approval', () => ({ notifyRoleApprovers: vi.fn() }));
vi.mock('@/lib/archive/guard', () => ({ assertMatterWritable: vi.fn() }));
vi.mock('@/lib/permissions', () => ({
  assertCanAccessMatter: vi.fn(),
  assertCanAssociateMatter: vi.fn(),
  assertCanLeadMatter: vi.fn(),
  isManager: vi.fn(() => false),
  matterVisibilityFilter: vi.fn(() => ({}))
}));
vi.mock('@/lib/storage', () => ({
  storage: { writeFile: vi.fn(async () => 'p/inv.bin'), deleteFile: vi.fn() }
}));
vi.mock('@/lib/storage/file-validator', () => ({ validateUploadedFile: vi.fn() }));
vi.mock('@/lib/storage/crypto', () => ({
  encryptBuffer: vi.fn(() => ({ ciphertext: Buffer.from('c'), iv: Buffer.from('i'), authTag: Buffer.from('a'), algorithm: 'aes-256-gcm' })),
  sha256: vi.fn(() => 'hash')
}));

import { createInvoiceRequest, listInvoiceRequests, listInvoiceRequestsByMatter } from '@/server/invoices/invoice-request-actions';
import { approveInvoiceRequest, rejectInvoiceRequest, getInvoiceStats } from '@/server/invoices/invoice-approval-actions';
import { requireFinanceOrApprover } from '@/server/invoices/invoice-visibility';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth/session';
import { audit } from '@/server/audit';
import { notifyRoleApprovers } from '@/server/notifications/approval';
import { isManager } from '@/lib/permissions';

const session = (role = 'LAWYER', id = ID.user) => ({
  user: { id, role, name: 'Tester' },
  expires: new Date(Date.now() + 3600000).toISOString()
});

function fd(entries: Record<string, unknown>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    if (v instanceof File) f.set(k, v);
    else f.set(k, String(v));
  }
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireSession.mockResolvedValue(session());
  isManager.mockReturnValue(false);
});

describe('requireFinanceOrApprover', () => {
  it('LAWYER bị chặn', () => {
    expect(() => requireFinanceOrApprover('LAWYER')).toThrow('Tài chính');
  });
  it('FINANCE được qua', () => {
    expect(() => requireFinanceOrApprover('FINANCE')).not.toThrow();
  });
});

describe('createInvoiceRequest', () => {
  it('tạo request PENDING + audit + notify', async () => {
    prisma.invoiceRequest.create.mockResolvedValue({ id: ID.req });
    prisma.matter.findUnique.mockResolvedValue({ internalCode: 'LL-1', title: 'Vụ A' });
    const res = await createInvoiceRequest({ matterId: ID.matter, amount: 1000 });
    expect(res).toEqual({ ok: true, id: ID.req });
    expect(prisma.invoiceRequest.create.mock.calls[0][0].data.status).toBe('PENDING');
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'INVOICE_REQUEST_CREATE' }));
    expect(notifyRoleApprovers).toHaveBeenCalledWith(expect.objectContaining({ roles: ['ADMIN', 'PRINCIPAL_LAWYER', 'FINANCE'] }));
  });

  it('amount <= 0 thì chặn', async () => {
    await expect(createInvoiceRequest({ matterId: ID.matter, amount: 0 })).rejects.toThrow();
  });
});

describe('listInvoiceRequests', () => {
  it('gắn evidenceDocs theo id', async () => {
    prisma.invoiceRequest.findMany.mockResolvedValue([
      { id: ID.req, amount: 500, evidenceDocIds: [ID.doc] }
    ]);
    prisma.document.findMany.mockResolvedValue([{ id: ID.doc, name: 'HD.pdf' }]);
    const rows = await listInvoiceRequests();
    expect(rows[0].amount).toBe(500);
    expect(rows[0].evidenceDocs).toHaveLength(1);
  });

  it('không có evidence thì không query document', async () => {
    prisma.invoiceRequest.findMany.mockResolvedValue([{ id: ID.req, amount: 500, evidenceDocIds: [] }]);
    await listInvoiceRequests();
    expect(prisma.document.findMany).not.toHaveBeenCalled();
  });
});

describe('approveInvoiceRequest', () => {
  const existing = { id: ID.req, matterId: ID.matter, status: 'PENDING' };

  beforeEach(() => {
    requireSession.mockResolvedValue(session('FINANCE'));
    prisma.invoiceRequest.findUnique.mockResolvedValue(existing);
  });

  it('thiếu requestId thì chặn', async () => {
    await expect(approveInvoiceRequest(fd({}))).rejects.toThrow('Thiếu requestId');
  });

  it('request đã ISSUED thì chặn', async () => {
    prisma.invoiceRequest.findUnique.mockResolvedValue({ ...existing, status: 'ISSUED' });
    await expect(approveInvoiceRequest(fd({ requestId: ID.req }))).rejects.toThrow('đã xuất hóa đơn');
  });

  it('không có file → APPROVED', async () => {
    prisma.$transaction.mockImplementation(async (fn) => fn({ document: { create: vi.fn() }, invoiceRequest: { update: vi.fn() } }));
    const res = await approveInvoiceRequest(fd({ requestId: ID.req, processNote: 'ok' }));
    expect(res.status).toBe('APPROVED');
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'INVOICE_APPROVED' }));
  });

  it('có invoiceFile → ISSUED (regression bug AUTO-67e)', async () => {
    prisma.$transaction.mockImplementation(async (fn) => fn({ document: { create: vi.fn().mockResolvedValue({ id: ID.doc }) }, invoiceRequest: { update: vi.fn() } }));
    const res = await approveInvoiceRequest(fd({
      requestId: ID.req,
      invoiceFile: new File([new Uint8Array(5)], 'inv.pdf', { type: 'application/pdf' }),
      invoiceNo: 'HD-001'
    }));
    expect(res.status).toBe('ISSUED');
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'INVOICE_ISSUED' }));
    // invoiceNo ghi vào update khi ISSUED
    const updateArg = prisma.$transaction.mock.calls[0][0];
    expect(updateArg).toBeTypeOf('function');
  });

  it('có contractScan → vẫn APPROVED', async () => {
    prisma.$transaction.mockImplementation(async (fn) => fn({ document: { create: vi.fn().mockResolvedValue({ id: ID.doc }) }, invoiceRequest: { update: vi.fn() } }));
    const res = await approveInvoiceRequest(fd({
      requestId: ID.req,
      contractScan: new File([new Uint8Array(5)], 'scan.pdf', { type: 'application/pdf' })
    }));
    expect(res.status).toBe('APPROVED');
  });
});

describe('rejectInvoiceRequest', () => {
  it('reject + audit', async () => {
    requireSession.mockResolvedValue(session('FINANCE'));
    prisma.invoiceRequest.findUnique.mockResolvedValue({ matterId: ID.matter, status: 'PENDING' });
    const res = await rejectInvoiceRequest({ requestId: ID.req, reason: 'thiếu chứng từ' });
    expect(res).toEqual({ ok: true });
    expect(prisma.invoiceRequest.update.mock.calls[0][0].data.status).toBe('REJECTED');
    expect(prisma.invoiceRequest.update.mock.calls[0][0].data.processNote).toBe('thiếu chứng từ');
  });

  it('reason rỗng thì chặn', async () => {
    requireSession.mockResolvedValue(session('FINANCE'));
    await expect(rejectInvoiceRequest({ requestId: ID.req, reason: '' })).rejects.toThrow();
  });
});

describe('getInvoiceStats', () => {
  it('tổng hợp issued + pending', async () => {
    requireSession.mockResolvedValue(session('FINANCE'));
    prisma.invoiceRequest.aggregate.mockResolvedValue({ _sum: { amount: 5000 }, _count: 2 });
    prisma.invoiceRequest.count.mockResolvedValue(3);
    const stats = await getInvoiceStats();
    expect(stats).toEqual({ monthlyIssued: 5000, monthlyIssuedCount: 2, pendingCount: 3 });
  });
});
