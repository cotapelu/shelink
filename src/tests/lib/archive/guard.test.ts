import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  assertMatterWritable,
  isArchiveFolderName,
  assertDocumentWritable
} from '@/lib/archive/guard';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    matter: {
      findFirst: vi.fn()
    }
  }
}));
vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn()
}));
vi.mock('@/lib/permissions', () => ({
  matterAssociationFilter: vi.fn(() => ({ userId: 'user-1' }))
}));

import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth/session';

const mockFindFirst = vi.mocked(prisma.matter.findFirst, true);
const mockRequireSession = vi.mocked(requireSession, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('archive guard', () => {
  describe('isArchiveFolderName', () => {
    it('returns true for Lưu trữ', () => {
      expect(isArchiveFolderName('Lưu trữ')).toBe(true);
    });
    it('returns true for Đóng', () => {
      expect(isArchiveFolderName('Đóng')).toBe(true);
    });
    it('returns false for other names', () => {
      expect(isArchiveFolderName('Thường')).toBe(false);
    });
    it('returns false for null/undefined', () => {
      expect(isArchiveFolderName(null)).toBe(false);
      expect(isArchiveFolderName(undefined)).toBe(false);
    });
  });

  describe('assertMatterWritable', () => {
    it('allows if matter not archived', async () => {
      mockFindFirst.mockResolvedValue({
        status: 'PENDING',
        archivedAt: null
      } as any);
      mockRequireSession.mockResolvedValue({
        user: { id: 'u1', role: 'LAWYER', avatar: null },
        expires: new Date().toISOString()
      });

      await expect(
        assertMatterWritable('matter-1')
      ).resolves.toBeUndefined();
    });

    it('throws if matter archived', async () => {
      mockFindFirst.mockResolvedValue({
        status: 'ARCHIVED',
        archivedAt: new Date()
      } as any);
      mockRequireSession.mockResolvedValue({
        user: { id: 'u1', role: 'LAWYER', avatar: null },
        expires: new Date().toISOString()
      });

      await expect(
        assertMatterWritable('matter-1')
      ).rejects.toThrow('Vụ án đã lưu trữ');
    });

    it('throws with allowedIfArchivedReason appended', async () => {
      mockFindFirst.mockResolvedValue({
        status: 'ARCHIVED',
        archivedAt: new Date()
      } as any);
      mockRequireSession.mockResolvedValue({
        user: { id: 'u1', role: 'LAWYER', avatar: null },
        expires: new Date().toISOString()
      });

      await expect(
        assertMatterWritable('matter-1', { allowedIfArchivedReason: 'upload docs' })
      ).rejects.toThrow('ngoại lệ: upload docs');
    });

    it('throws if matter not found', async () => {
      mockFindFirst.mockResolvedValue(null as any);
      mockRequireSession.mockResolvedValue({
        user: { id: 'u1', role: 'LAWYER', avatar: null },
        expires: new Date().toISOString()
      });

      await expect(
        assertMatterWritable('matter-1')
      ).rejects.toThrow('Vụ án không tồn tại hoặc không có quyền xử lý');
    });

    it('returns early if matterId falsy', async () => {
      mockFindFirst.mockResolvedValue({
        status: 'PENDING',
        archivedAt: null
      } as any);
      mockRequireSession.mockResolvedValue({
        user: { id: 'u1', role: 'LAWYER', avatar: null },
        expires: new Date().toISOString()
      });

      await expect(
        assertMatterWritable(null)
      ).resolves.toBeUndefined();
      expect(mockFindFirst).not.toHaveBeenCalled();
    });
  });

  describe('assertDocumentWritable', () => {
    it('allows upload if archived but folder is ARCHIVE', async () => {
      mockFindFirst.mockResolvedValue({
        status: 'ARCHIVED',
        archivedAt: new Date()
      } as any);
      mockRequireSession.mockResolvedValue({
        user: { id: 'u1', role: 'LAWYER', avatar: null },
        expires: new Date().toISOString()
      });

      await expect(
        assertDocumentWritable('matter-1', { kind: 'upload', folderName: 'Lưu trữ' })
      ).resolves.toBeUndefined();
    });

    it('allows upload if archived but folder is Đóng', async () => {
      mockFindFirst.mockResolvedValue({
        status: 'ARCHIVED',
        archivedAt: new Date()
      } as any);
      mockRequireSession.mockResolvedValue({
        user: { id: 'u1', role: 'LAWYER', avatar: null },
        expires: new Date().toISOString()
      });

      await expect(
        assertDocumentWritable('matter-1', { kind: 'upload', folderName: 'Đóng' })
      ).resolves.toBeUndefined();
    });

    it('rejects upload to non-archive folder when archived', async () => {
      mockFindFirst.mockResolvedValue({
        status: 'ARCHIVED',
        archivedAt: new Date()
      } as any);
      mockRequireSession.mockResolvedValue({
        user: { id: 'u1', role: 'LAWYER', avatar: null },
        expires: new Date().toISOString()
      });

      await expect(
        assertDocumentWritable('matter-1', { kind: 'upload', folderName: 'Thường' })
      ).rejects.toThrow('案件已归档，仅允许补传材料到「结案」或「归档」卷宗');
    });

    it('rejects modify when archived', async () => {
      mockFindFirst.mockResolvedValue({
        status: 'ARCHIVED',
        archivedAt: new Date()
      } as any);
      mockRequireSession.mockResolvedValue({
        user: { id: 'u1', 'role': 'LAWYER', avatar: null },
        expires: new Date().toISOString()
      });

      await expect(
        assertDocumentWritable('matter-1', { kind: 'modify' })
      ).rejects.toThrow('案件已归档，材料不可修改或删除');
    });

    it('allows modify if matter not archived', async () => {
      mockFindFirst.mockResolvedValue({
        status: 'PENDING',
        archivedAt: null
      } as any);
      mockRequireSession.mockResolvedValue({
        user: { id: 'u1', role: 'LAWYER', avatar: null },
        expires: new Date().toISOString()
      });

      await expect(
        assertDocumentWritable('matter-1', { kind: 'modify' })
      ).resolves.toBeUndefined();
    });

    it('returns early if matterId falsy', async () => {
      mockFindFirst.mockResolvedValue({
        status: 'ARCHIVED',
        archivedAt: new Date()
      } as any);
      mockRequireSession.mockResolvedValue({
        user: { id: 'u1', role: 'LAWYER', avatar: null },
        expires: new Date().toISOString()
      });

      await expect(
        assertDocumentWritable(null, { kind: 'modify' })
      ).resolves.toBeUndefined();
      expect(mockFindFirst).not.toHaveBeenCalled();
    });
  });
});
