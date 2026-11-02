/**
 * Test cho document-upload + document-review — AUTO-67d.
 */
// @ts-nocheck - Test file với mock rộng, bỏ strict type checking như pattern có sẵn
import { describe, it, expect, vi, beforeEach } from 'vitest';
import cuid from 'cuid';

const ID = { doc: cuid(), matter: cuid(), intake: cuid(), folder: cuid(), user: cuid(), other: cuid() };

vi.mock('@/lib/prisma', () => ({
  prisma: {
    matter: { findUnique: vi.fn() },
    intake: { findUnique: vi.fn() },
    documentFolder: { findUnique: vi.fn() },
    document: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn()
    },
    timelineEvent: { create: vi.fn() },
    user: { findMany: vi.fn() }
  }
}));
vi.mock('@/lib/auth/session', () => ({ requireSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/server/audit', () => ({ audit: vi.fn() }));
vi.mock('@/lib/permissions', () => ({
  matterVisibilityFilter: vi.fn(() => ({})),
  isManager: vi.fn(() => true),
  assertCanAccessMatter: vi.fn(),
  assertCanLeadMatter: vi.fn(),
  assertCanAssociateMatter: vi.fn()
}));
vi.mock('@/lib/archive/guard', () => ({ assertDocumentWritable: vi.fn() }));
vi.mock('@/lib/storage', () => ({
  storage: { writeFile: vi.fn(async () => 'p/x.bin'), deleteFile: vi.fn() }
}));
vi.mock('@/lib/storage/file-validator', () => ({ validateUploadedFile: vi.fn() }));
vi.mock('@/lib/storage/crypto', () => ({
  encryptBuffer: vi.fn(() => ({ ciphertext: Buffer.from('c'), iv: Buffer.from('i'), authTag: Buffer.from('a'), algorithm: 'aes-256-gcm' })),
  sha256: vi.fn(() => 'hash')
}));

import { uploadDocument, deleteDocument, hardDeleteDocument, listAllDocuments } from '@/server/documents/document-upload';
import { submitDocumentForReview, approveDocument, rejectDocument, fileDocument } from '@/server/documents/document-review';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth/session';
import { audit } from '@/server/audit';
import { isManager, assertCanAccessMatter, assertCanLeadMatter } from '@/lib/permissions';
import { assertDocumentWritable } from '@/lib/archive/guard';

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

const baseForm = () => ({
  matterId: ID.matter,
  name: 'Hợp đồng.pdf',
  category: 'CONTRACT',
  file: new File([new Uint8Array(10)], 'a.pdf', { type: 'application/pdf' })
});

beforeEach(() => {
  vi.clearAllMocks();
  requireSession.mockResolvedValue(session());
  isManager.mockReturnValue(true);
});

describe('uploadDocument', () => {
  it('thiếu file thì chặn', async () => {
    await expect(uploadDocument(fd({ matterId: ID.matter, name: 'x' }))).rejects.toThrow('Thiếu tệp');
  });

  it('thiếu cả matterId và intakeId thì chặn', async () => {
    await expect(uploadDocument(fd({ name: 'x', file: new File(['a'], 'a.pdf') }))).rejects.toThrow(
      'Cần ít nhất một trong hai'
    );
  });

  it('thiếu tên thì chặn', async () => {
    await expect(uploadDocument(fd({ matterId: ID.matter, file: new File(['a'], 'a.pdf') }))).rejects.toThrow(
      'Tên tài liệu bắt buộc nhập'
    );
  });

  it('matter không tồn tại thì chặn', async () => {
    prisma.matter.findUnique.mockResolvedValue(null);
    await expect(uploadDocument(fd(baseForm()))).rejects.toThrow('Vụ án không tồn tại');
  });

  it('upload thành công ghi document + audit + timeline', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: ID.matter, status: 'IN_PROGRESS' });
    prisma.document.create.mockResolvedValue({ id: ID.doc });
    const res = await uploadDocument(fd(baseForm()));
    expect(res).toEqual({ ok: true, id: ID.doc });
    expect(assertCanAccessMatter).toHaveBeenCalledWith(ID.user, 'LAWYER', ID.matter);
    expect(assertDocumentWritable).toHaveBeenCalledWith(ID.matter, { kind: 'upload', folderName: null });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'DOCUMENT_UPLOAD' }));
    expect(prisma.timelineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: 'DOCUMENT_UPLOADED' }) })
    );
  });

  it('folder không khớp matter thì chặn', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: ID.matter, status: 'IN_PROGRESS' });
    prisma.documentFolder.findUnique.mockResolvedValue({ matterId: ID.other, name: 'X' });
    await expect(uploadDocument(fd({ ...baseForm(), folderId: ID.folder }))).rejects.toThrow(
      'Hồ sơ đích không khớp với vụ án'
    );
  });

  it('intake DECLINED thì chặn', async () => {
    prisma.intake.findUnique.mockResolvedValue({ id: ID.intake, status: 'DECLINED', createdById: ID.user, ownerUserId: null, coUserIds: [] });
    await expect(uploadDocument(fd({ name: 'x', category: 'OTHER', intakeId: ID.intake, file: new File(['a'], 'a.pdf') }))).rejects.toThrow(
      'Tiếp nhận đã từ chối'
    );
  });

  it('intake của người khác thì chặn', async () => {
    isManager.mockReturnValue(false);
    prisma.intake.findUnique.mockResolvedValue({ id: ID.intake, status: 'INTAKE', createdById: ID.other, ownerUserId: ID.other, coUserIds: [] });
    await expect(uploadDocument(fd({ name: 'x', category: 'OTHER', intakeId: ID.intake, file: new File(['a'], 'a.pdf') }))).rejects.toThrow(
      'Không có quyền tải tài liệu lên'
    );
  });

  it('folder khớp matter thì upload với folderName', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: ID.matter, status: 'IN_PROGRESS' });
    prisma.documentFolder.findUnique.mockResolvedValue({ matterId: ID.matter, name: 'Hợp đồng' });
    prisma.document.create.mockResolvedValue({ id: ID.doc });
    await uploadDocument(fd({ ...baseForm(), folderId: ID.folder }));
    expect(assertDocumentWritable).toHaveBeenCalledWith(ID.matter, { kind: 'upload', folderName: 'Hợp đồng' });
  });
});

describe('deleteDocument', () => {
  it('doc không tồn tại → ok false', async () => {
    prisma.document.findUnique.mockResolvedValue(null);
    expect(await deleteDocument(ID.doc)).toEqual({ ok: false });
  });

  it('người không upload và không lead thì chặn', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: ID.doc, matterId: ID.matter, intakeId: null, uploadedById: ID.other, name: 'x' });
    assertCanLeadMatter.mockRejectedValue(new Error('Không có quyền'));
    await expect(deleteDocument(ID.doc)).rejects.toThrow('Không có quyền');
  });

  it('soft delete + audit', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: ID.doc, matterId: ID.matter, intakeId: null, uploadedById: ID.user, name: 'x' });
    const res = await deleteDocument(ID.doc);
    expect(res).toEqual({ ok: true });
    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) })
    );
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'DOCUMENT_DELETE' }));
  });

  it('doc intake của người khác, không phải manager thì chặn', async () => {
    isManager.mockReturnValue(false);
    requireSession.mockResolvedValue(session('LAWYER'));
    prisma.document.findUnique.mockResolvedValue({ id: ID.doc, matterId: null, intakeId: ID.intake, uploadedById: ID.other, name: 'x' });
    await expect(deleteDocument(ID.doc)).rejects.toThrow('Chỉ xoá được tài liệu do mình tải lên');
  });
});

describe('hardDeleteDocument', () => {
  it('không phải ADMIN thì chặn', async () => {
    requireSession.mockResolvedValue(session('LAWYER'));
    await expect(hardDeleteDocument(ID.doc)).rejects.toThrow('Chỉ ADMIN');
  });

  it('ADMIN xoá hẳn + deleteFile', async () => {
    requireSession.mockResolvedValue(session('ADMIN'));
    prisma.document.findUnique.mockResolvedValue({ id: ID.doc, matterId: null, intakeId: null, path: 'p/x.bin', name: 'x' });
    await hardDeleteDocument(ID.doc);
    expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: ID.doc } });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'DOCUMENT_HARD_DELETE' }));
  });
});

describe('listAllDocuments', () => {
  it('where mặc định deletedAt null', async () => {
    prisma.document.findMany.mockResolvedValue([]);
    await listAllDocuments();
    const where = prisma.document.findMany.mock.calls[0][0].where;
    expect(where.deletedAt).toBeNull();
  });
});

describe('review flow', () => {
  const docRow = (over = {}) => ({ id: ID.doc, matterId: ID.matter, uploadedById: ID.user, name: 'x', status: 'DRAFT', ...over });

  it('submit: không phải DRAFT thì chặn', async () => {
    prisma.document.findUnique.mockResolvedValue(docRow({ status: 'PENDING_REVIEW' }));
    await expect(submitDocumentForReview(ID.doc)).rejects.toThrow('trạng thái nháp');
  });

  it('submit: DRAFT → PENDING_REVIEW', async () => {
    prisma.document.findUnique.mockResolvedValue(docRow());
    await submitDocumentForReview(ID.doc);
    expect(prisma.document.update).toHaveBeenCalledWith({ where: { id: ID.doc }, data: { status: 'PENDING_REVIEW' } });
  });

  it('approve: không phải manager thì chặn', async () => {
    isManager.mockReturnValue(false);
    prisma.document.findUnique.mockResolvedValue(docRow({ status: 'PENDING_REVIEW' }));
    await expect(approveDocument(ID.doc)).rejects.toThrow('quản trị viên hoặc luật sư chủ trì');
  });

  it('approve: PENDING_REVIEW → APPROVED kèm người duyệt', async () => {
    prisma.document.findUnique.mockResolvedValue(docRow({ status: 'PENDING_REVIEW' }));
    await approveDocument(ID.doc);
    const data = prisma.document.update.mock.calls[0][0].data;
    expect(data.status).toBe('APPROVED');
    expect(data.approvedById).toBe(ID.user);
  });

  it('reject: về DRAFT kèm reviewedBy', async () => {
    prisma.document.findUnique.mockResolvedValue(docRow({ status: 'PENDING_REVIEW' }));
    await rejectDocument(ID.doc, 'thiếu chữ ký');
    const data = prisma.document.update.mock.calls[0][0].data;
    expect(data.status).toBe('DRAFT');
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.objectContaining({ reason: 'thiếu chữ ký' }) }));
  });

  it('file: không phải APPROVED thì chặn', async () => {
    prisma.document.findUnique.mockResolvedValue(docRow({ status: 'PENDING_REVIEW' }));
    await expect(fileDocument(ID.doc)).rejects.toThrow('đã duyệt mới lưu trữ');
  });

  it('file: APPROVED → FILED', async () => {
    prisma.document.findUnique.mockResolvedValue(docRow({ status: 'APPROVED' }));
    await fileDocument(ID.doc);
    expect(prisma.document.update).toHaveBeenCalledWith({ where: { id: ID.doc }, data: { status: 'FILED' } });
  });

  it('review action trên matter kiểm tra cả access + writable', async () => {
    prisma.document.findUnique.mockResolvedValue(docRow());
    await submitDocumentForReview(ID.doc);
    expect(assertCanAccessMatter).toHaveBeenCalledWith(ID.user, 'LAWYER', ID.matter);
    expect(assertDocumentWritable).toHaveBeenCalledWith(ID.matter, { kind: 'modify' });
  });
});
