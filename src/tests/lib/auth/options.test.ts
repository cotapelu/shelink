import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies FIRST
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn()
  }
}));

import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

describe('authOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CredentialsProvider authorize', () => {
    const mockUser = {
      id: 'u1',
      email: 'test@example.com',
      passwordHash: 'hash',
      name: 'Test User',
      role: 'LAWYER',
      active: true,
      avatar: null
    };

    it('authorizes valid credentials', async () => {
      const provider = authOptions.providers[0] as any;
      const authorizeFn = (provider.options?.authorize || provider.authorize) as any;
      expect(authorizeFn).toBeDefined();

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      (prisma.user.update as any).mockResolvedValue(mockUser);

      const credentials = { email: 'test@example.com', password: 'pw' };
      const result = await authorizeFn(credentials);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(result).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        avatar: mockUser.avatar
      });
    });

    it('rejects invalid email format', async () => {
      const provider = authOptions.providers[0] as any;
      const authorizeFn = (provider.options?.authorize || provider.authorize) as any;

      const result = await authorizeFn({
        email: 'invalid-email',
        password: 'password123'
      });

      expect(result).toBeNull();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('rejects missing password', async () => {
      const provider = authOptions.providers[0] as any;
      const authorizeFn = (provider.options?.authorize || provider.authorize) as any;

      const result = await authorizeFn({
        email: 'test@example.com',
        password: ''
      });

      expect(result).toBeNull();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('rejects non-existent user', async () => {
      const provider = authOptions.providers[0] as any;
      const authorizeFn = (provider.options?.authorize || provider.authorize) as any;
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const result = await authorizeFn({
        email: 'missing@example.com',
        password: 'password123'
      });

      expect(result).toBeNull();
    });

    it('rejects inactive user', async () => {
      const provider = authOptions.providers[0] as any;
      const authorizeFn = (provider.options?.authorize || provider.authorize) as any;
      (prisma.user.findUnique as any).mockResolvedValue({
        ...mockUser,
        active: false
      });

      const result = await authorizeFn({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result).toBeNull();
    });

    it('rejects wrong password', async () => {
      const provider = authOptions.providers[0] as any;
      const authorizeFn = (provider.options?.authorize || provider.authorize) as any;
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      const result = await authorizeFn({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

      expect(result).toBeNull();
    });

    it('attempts to update lastLoginAt on success', async () => {
      const provider = authOptions.providers[0] as any;
      const authorizeFn = (provider.options?.authorize || provider.authorize) as any;
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      (prisma.user.update as any).mockResolvedValue(mockUser);

      const result = await authorizeFn({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) }
      });
      expect(result).not.toBeNull();
    });

    it('ignores update failure and still returns user', async () => {
      const provider = authOptions.providers[0] as any;
      const authorizeFn = (provider.options?.authorize || provider.authorize) as any;
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      (prisma.user.update as any).mockRejectedValue(new Error('DB error'));

      const result = await authorizeFn({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result).not.toBeNull();
    });
  });

  describe('JWT callback', () => {
    it('adds user info to token on sign-in', async () => {
      const callbacks = authOptions.callbacks as any;
      const token = {};
      const user = {
        id: 'u1',
        name: 'Test',
        email: 'test@example.com',
        role: 'ADMIN',
        avatar: 'url'
      };

      const result = await callbacks.jwt({ token, user });

      expect(result.id).toBe(user.id);
      expect(result.role).toBe(user.role);
      expect(result.avatar).toBe(user.avatar);
    });

    it('preserves existing token when no user', async () => {
      const callbacks = authOptions.callbacks as any;
      const token = { id: 'u1', role: 'LAWYER', avatar: null };

      const result = await callbacks.jwt({ token, user: undefined });

      expect(result).toEqual(token);
    });
  });

  describe('Session callback', () => {
    it('maps token to session.user', async () => {
      const callbacks = authOptions.callbacks as any;
      const session = { user: { id: '', name: '', email: '' } } as any;
      const token = { id: 'u1', role: 'FINANCE', avatar: 'av' };

      const result = await callbacks.session({ session, token });

      expect(session.user.id).toBe(token.id);
      expect(session.user.role).toBe(token.role);
      expect(session.user.avatar).toBe(token.avatar);
    });

    it('handles session without user property', async () => {
      const callbacks = authOptions.callbacks as any;
      const session = {} as any;
      const token = { id: 'u1', role: 'LAWYER', avatar: null };

      const result = await callbacks.session({ session, token });

      expect(result).toEqual(session);
    });
  });
});
