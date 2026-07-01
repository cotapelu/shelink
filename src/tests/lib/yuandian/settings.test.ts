import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  readStoredYuandianSettings,
  getYuandianSettings,
  saveYuandianSettings,
  readPublicYuandianSettings,
  YUANDIAN_DEFAULTS
} from '@/lib/yuandian/settings';
import { prisma } from '@/lib/prisma';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    systemSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// Mock crypto module
vi.mock('@/lib/storage/crypto', () => ({
  encryptBuffer: vi.fn(() => ({
    ciphertext: Buffer.from('encrypted'),
    iv: Buffer.from('iv1234'),
    authTag: Buffer.from('tag5678'),
  })),
  decryptBuffer: vi.fn(() => Buffer.from('decrypted')),
  getKey: vi.fn(() => Buffer.from('testkey1234567890123456789012', 'utf8')),
}));

describe('Yuandian Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STORAGE_ENCRYPTION_KEY = 'c2VjcmV0a2V5MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMg==';
  });

  afterEach(() => {
    delete process.env.STORAGE_ENCRYPTION_KEY;
  });

  describe('readStoredYuandianSettings', () => {
    it('should return defaults when no stored row', async () => {
      (prisma.systemSetting.findUnique as any).mockResolvedValue(null);
      const settings = await readStoredYuandianSettings();
      expect(settings.baseUrl).toBe(YUANDIAN_DEFAULTS.baseUrl);
      expect(settings.caseDetailHost).toBe(YUANDIAN_DEFAULTS.caseDetailHost);
      expect(settings.apiKeyCipher).toBeNull();
    });

    it('should return stored values', async () => {
      const stored = {
        apiKeyCipher: { ct: 'ciphertext', iv: 'iv', tag: 'tag' },
        baseUrl: 'https://custom.example.com',
        caseDetailHost: 'https://custom.example.com/case',
      };
      (prisma.systemSetting.findUnique as any).mockResolvedValue({ value: stored });
      const settings = await readStoredYuandianSettings();
      expect(settings.apiKeyCipher).toEqual(stored.apiKeyCipher);
      expect(settings.baseUrl).toBe(stored.baseUrl);
      expect(settings.caseDetailHost).toBe(stored.caseDetailHost);
    });
  });

  describe('getYuandianSettings', () => {
    it('should resolve configured=true when apiKey exists', async () => {
      const cipher = { ct: 'c', iv: 'i', tag: 't' };
      (prisma.systemSetting.findUnique as any).mockResolvedValue({
        value: { apiKeyCipher: cipher, baseUrl: YUANDIAN_DEFAULTS.baseUrl, caseDetailHost: YUANDIAN_DEFAULTS.caseDetailHost },
      });
      const res = await getYuandianSettings();
      expect(res.configured).toBe(true);
      expect(res.apiKey).toBe('decrypted');
    });

    it('should resolve configured=false when no apiKey', async () => {
      (prisma.systemSetting.findUnique as any).mockResolvedValue({
        value: { apiKeyCipher: null, baseUrl: YUANDIAN_DEFAULTS.baseUrl, caseDetailHost: YUANDIAN_DEFAULTS.caseDetailHost },
      });
      const res = await getYuandianSettings();
      expect(res.configured).toBe(false);
      expect(res.apiKey).toBe('');
    });
  });

  describe('readPublicYuandianSettings', () => {
    it('should mask apiKey', async () => {
      const cipher = { ct: 'c', iv: 'i', tag: 't' };
      (prisma.systemSetting.findUnique as any).mockResolvedValue({
        value: { apiKeyCipher: cipher, baseUrl: YUANDIAN_DEFAULTS.baseUrl, caseDetailHost: YUANDIAN_DEFAULTS.caseDetailHost },
      });
      const pub = await readPublicYuandianSettings();
      expect(pub.configured).toBe(true);
      // 'decrypted' -> first 4 'decr', last 4 'pted'
      expect(pub.apiKeyMasked).toBe('decr••••pted');
    });
  });

  describe('saveYuandianSettings', () => {
    it('should call upsert at least once', async () => {
      (prisma.systemSetting.findUnique as any).mockResolvedValue(null);
      (prisma.systemSetting.upsert as any).mockResolvedValue({});
      await saveYuandianSettings({ apiKey: 'new-key', baseUrl: 'https://new.example.com' });
      expect(prisma.systemSetting.upsert).toHaveBeenCalled();
    });

    it('should handle update without throwing', async () => {
      const current = {
        apiKeyCipher: { ct: Buffer.from('old'), iv: Buffer.from('iv'), tag: Buffer.from('tag') },
        baseUrl: YUANDIAN_DEFAULTS.baseUrl,
        caseDetailHost: YUANDIAN_DEFAULTS.caseDetailHost,
      };
      (prisma.systemSetting.findUnique as any).mockResolvedValue({ value: current });
      (prisma.systemSetting.upsert as any).mockResolvedValue({});
      await saveYuandianSettings({ apiKey: 'new-key' });
      expect(prisma.systemSetting.upsert).toHaveBeenCalled();
    });

    it('should handle clearKey without throwing', async () => {
      const current = {
        apiKeyCipher: { ct: Buffer.from('old'), iv: Buffer.from('iv'), tag: Buffer.from('tag') },
        baseUrl: YUANDIAN_DEFAULTS.baseUrl,
        caseDetailHost: YUANDIAN_DEFAULTS.caseDetailHost,
      };
      (prisma.systemSetting.findUnique as any).mockResolvedValue({ value: current });
      (prisma.systemSetting.upsert as any).mockResolvedValue({});
      await saveYuandianSettings({ clearKey: true });
      expect(prisma.systemSetting.upsert).toHaveBeenCalled();
    });
  });
});
