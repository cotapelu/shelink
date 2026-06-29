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
import {
  assertCanAccessMatter,
  assertCanAssociateMatter,
  assertCanHandleMatter,
  assertCanLeadMatter,
  assertCanOwnMatter,
  assertCanModifyMatter
} from '@/lib/permissions/index';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    matter: {
      findFirst: vi.fn()
    }
  }
}));

describe('assertCanAccessMatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows manager to access existing matter', async () => {
    (prisma.matter.findFirst as any).mockResolvedValue({ id: 'm1' });

    await assertCanAccessMatter('u1', 'ADMIN', 'm1');

    expect(prisma.matter.findFirst).toHaveBeenCalledWith({
      where: { id: 'm1', deletedAt: null },
      select: { id: true }
    });
  });

  it('allows FINANCE to access existing matter', async () => {
    (prisma.matter.findFirst as any).mockResolvedValue({ id: 'm1' });

    await assertCanAccessMatter('u1', 'FINANCE', 'm1');

    expect(prisma.matter.findFirst).toHaveBeenCalledWith({
      where: { id: 'm1', deletedAt: null },
      select: { id: true }
    });
  });

  it('throws if matter does not exist for manager', async () => {
    (prisma.matter.findFirst as any).mockResolvedValue(null);

    await expect(assertCanAccessMatter('u1', 'ADMIN', 'm1')).rejects.toThrow('案件不存在');
  });

  it('allows non-manager if matches visibility filter', async () => {
    (prisma.matter.findFirst as any).mockResolvedValue({ id: 'm1' });

    await assertCanAccessMatter('u1', 'LAWYER', 'm1');

    expect(prisma.matter.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'm1',
        deletedAt: null,
        OR: [
          { ownerId: 'u1' },
          { members: { some: { userId: 'u1' } } }
        ]
      },
      select: { id: true }
    });
  });

  it('throws if non-manager fails visibility filter', async () => {
    (prisma.matter.findFirst as any).mockResolvedValue(null);

    await expect(assertCanAccessMatter('u1', 'LAWYER', 'm1')).rejects.toThrow('案件不存在');
  });
});

describe('assertCanAssociateMatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows association if user is owner or member', async () => {
    (prisma.matter.findFirst as any).mockResolvedValue({ id: 'm1' });

    await assertCanAssociateMatter('u1', 'm1');

    expect(prisma.matter.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'm1',
        deletedAt: null,
        OR: [
          { ownerId: 'u1' },
          { members: { some: { userId: 'u1' } } }
        ]
      },
      select: { id: true }
    });
  });

  it('throws if not owner or member', async () => {
    (prisma.matter.findFirst as any).mockResolvedValue(null);

    await expect(assertCanAssociateMatter('u1', 'm1')).rejects.toThrow('案件不存在或无权关联');
  });
});

describe('assertCanHandleMatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows handling if user is owner or member', async () => {
    (prisma.matter.findFirst as any).mockResolvedValue({ id: 'm1' });

    await assertCanHandleMatter('u1', 'm1');

    expect(prisma.matter.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'm1',
        deletedAt: null,
        OR: [
          { ownerId: 'u1' },
          { members: { some: { userId: 'u1' } } }
        ]
      },
      select: { id: true }
    });
  });

  it('throws if not owner or member', async () => {
    (prisma.matter.findFirst as any).mockResolvedValue(null);

    await expect(assertCanHandleMatter('u1', 'm1')).rejects.toThrow('案件不存在或无权处理');
  });
});

describe('assertCanLeadMatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows lead/co-lead or owner', async () => {
    (prisma.matter.findFirst as any).mockResolvedValue({ id: 'm1' });

    await assertCanLeadMatter('u1', 'm1');

    expect(prisma.matter.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'm1',
        deletedAt: null,
        OR: [
          { ownerId: 'u1' },
          { members: { some: { userId: 'u1', role: { in: ['LEAD', 'CO_LEAD'] } } } }
        ]
      },
      select: { id: true }
    });
  });

  it('throws if not lead/co-lead/owner', async () => {
    (prisma.matter.findFirst as any).mockResolvedValue(null);

    await expect(assertCanLeadMatter('u1', 'm1')).rejects.toThrow('仅案件主办/协办可操作');
  });

  it('uses custom message when provided', async () => {
    (prisma.matter.findFirst as any).mockResolvedValue(null);

    await expect(assertCanLeadMatter('u1', 'm1', 'Custom error')).rejects.toThrow('Custom error');
  });
});

describe('assertCanOwnMatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows owner', async () => {
    (prisma.matter.findFirst as any).mockResolvedValue({ id: 'm1' });

    await assertCanOwnMatter('u1', 'm1');

    expect(prisma.matter.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'm1',
        deletedAt: null,
        ownerId: 'u1'
      },
      select: { id: true }
    });
  });

  it('throws if not owner', async () => {
    (prisma.matter.findFirst as any).mockResolvedValue(null);

    await expect(assertCanOwnMatter('u1', 'm1')).rejects.toThrow('仅案件主办律师可操作');
  });

  it('uses custom message when provided', async () => {
    (prisma.matter.findFirst as any).mockResolvedValue(null);

    await expect(assertCanOwnMatter('u1', 'm1', 'Not owner')).rejects.toThrow('Not owner');
  });
});

describe('assertCanModifyMatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows modification if user is owner or member', async () => {
    (prisma.matter.findFirst as any).mockResolvedValue({ id: 'm1' });

    await assertCanModifyMatter('u1', 'LAWYER', 'm1');

    expect(prisma.matter.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'm1',
        deletedAt: null,
        OR: [
          { ownerId: 'u1' },
          { members: { some: { userId: 'u1' } } }
        ]
      },
      select: { id: true }
    });
  });

  it('throws if matter not found or no permission', async () => {
    (prisma.matter.findFirst as any).mockResolvedValue(null);

    await expect(assertCanModifyMatter('u1', 'LAWYER', 'm1')).rejects.toThrow('案件不存在');
  });
});
