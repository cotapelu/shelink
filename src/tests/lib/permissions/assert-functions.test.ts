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

    await expect(assertCanAccessMatter('u1', 'ADMIN', 'm1')).rejects.toThrow('Vụ án không tồn tại');
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

    await expect(assertCanAccessMatter('u1', 'LAWYER', 'm1')).rejects.toThrow('Vụ án không tồn tại');
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

    await expect(assertCanAssociateMatter('u1', 'm1')).rejects.toThrow('Vụ án không tồn tại hoặc không có quyền liên kết');
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

    await expect(assertCanHandleMatter('u1', 'm1')).rejects.toThrow('Vụ án không tồn tại hoặc không có quyền xử lý');
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

    await expect(assertCanLeadMatter('u1', 'm1')).rejects.toThrow('Chỉ host/assistant của vụ án có thể thao tác');
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

    await expect(assertCanOwnMatter('u1', 'm1')).rejects.toThrow('Chỉ host lawyer của vụ án có thể thao tác');
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

    await expect(assertCanModifyMatter('u1', 'LAWYER', 'm1')).rejects.toThrow('Vụ án không tồn tại');
  });
});
