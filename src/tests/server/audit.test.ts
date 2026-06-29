/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
