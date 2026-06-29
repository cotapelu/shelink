/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { audit } from '@/server/audit';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn()
    }
  }
}));

describe('audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes audit log with all fields', async () => {
    const params = {
      userId: 'u1',
      action: 'CLIENT_CREATE',
      targetType: 'Client',
      targetId: 'c1',
      detail: { name: 'Test Client' },
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0'
    };

    (prisma.auditLog.create as any).mockResolvedValue({ id: 'a1' });

    await audit(params);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        action: 'CLIENT_CREATE',
        targetType: 'Client',
        targetId: 'c1',
        detail: { name: 'Test Client' },
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0'
      }
    });
  });

  it('handles null userId', async () => {
    const params = {
      userId: null,
      action: 'LOGIN',
      targetType: 'User',
      targetId: 'u2'
    };

    (prisma.auditLog.create as any).mockResolvedValue({ id: 'a2' });

    await audit(params);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: null,
        action: 'LOGIN',
        targetType: 'User',
        targetId: 'u2',
        detail: undefined,
        ip: undefined,
        userAgent: undefined
      }
    });
  });

  it('handles undefined fields', async () => {
    const params = {
      action: 'SYSTEM_EVENT'
    };

    (prisma.auditLog.create as any).mockResolvedValue({ id: 'a3' });

    await audit(params);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: null,
        action: 'SYSTEM_EVENT',
        targetType: undefined,
        targetId: undefined,
        detail: undefined,
        ip: undefined,
        userAgent: undefined
      }
    });
  });

  it('swallows database errors and logs to console', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const params = {
      userId: 'u1',
      action: 'FAILED_ACTION'
    };

    (prisma.auditLog.create as any).mockRejectedValue(new Error('DB connection lost'));

    await audit(params);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[audit] 写入失败：',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('does not throw on successful audit', async () => {
    const params = {
      userId: 'u1',
      action: 'MATTER_UPDATE',
      targetId: 'm1'
    };

    (prisma.auditLog.create as any).mockResolvedValue({ id: 'a4' });

    await expect(audit(params)).resolves.toBeUndefined();
  });
});
