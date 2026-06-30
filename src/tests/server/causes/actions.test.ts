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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listCauseL2, searchCauses, getCauseById } from '@/server/causes/actions';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth/session';

vi.mock('@/lib/prisma');
vi.mock('@/lib/auth/session');

describe('listCauseL2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns list of level 2 causes for given category', async () => {
    const mockCauses = [
      { id: '1', code: 'A1', name: 'Cause One', parentId: 'p1' },
      { id: '2', code: 'A2', name: 'Cause Two', parentId: 'p1' }
    ];
    vi.mocked(prisma.causeOfAction).findMany = vi.fn().mockResolvedValue(mockCauses);
    vi.mocked(requireSession).mockResolvedValue({} as any);

    const result = await listCauseL2('CIVIL' as any);

    expect(result).toEqual(mockCauses);
    expect(prisma.causeOfAction.findMany).toHaveBeenCalledWith({
      where: { category: 'CIVIL', active: true, level: 2 },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, parentId: true }
    });
    expect(requireSession).toHaveBeenCalled();
  });

  it('forwards prisma errors', async () => {
    const error = new Error('DB error');
    vi.mocked(prisma.causeOfAction).findMany = vi.fn().mockRejectedValue(error);
    vi.mocked(requireSession).mockResolvedValue({} as any);

    await expect(listCauseL2('CRIMINAL' as any)).rejects.toThrow('DB error');
  });
});

describe('searchCauses', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns empty array when no causes', async () => {
    vi.mocked(prisma.causeOfAction).findMany = vi.fn().mockResolvedValue([]);
    vi.mocked(requireSession).mockResolvedValue({} as any);
    const result = await searchCauses({ category: 'CIVIL' as any });
    expect(result).toEqual([]);
  });

  it('covers flatten with parent chain', async () => {
    const mockData = [{
      id: 'c1', code: 'C1', name: 'Child', shortName: 'C', level: 2,
      parentId: 'p1',
      parent: {
        id: 'p1', name: 'Parent', level: 1,
        parent: { id: 'g1', name: 'Grand', level: 0, parent: null }
      }
    }];
    vi.mocked(prisma.causeOfAction).findMany = vi.fn().mockResolvedValue(mockData);
    vi.mocked(requireSession).mockResolvedValue({} as any);
    const result = await searchCauses({ category: 'CIVIL' as any });
    expect(result).toHaveLength(1);
    expect(result[0].l1Name).toBe('Parent');
    expect(result[0].l2Name).toBe('Child');
  });

  it('applies level>=2 and OR when query provided', async () => {
    vi.mocked(prisma.causeOfAction).findMany = vi.fn().mockResolvedValue([]);
    vi.mocked(requireSession).mockResolvedValue({} as any);
    await searchCauses({ category: 'CIVIL' as any, query: 'test' });
    const args = vi.mocked(prisma.causeOfAction).findMany.mock.calls[0][0] as any;
    expect(args.where.level).toEqual({ gte: 2 });
    expect(args.where.AND).toBeDefined();
    expect(args.where.AND[0].OR).toBeDefined();
  });

  it('uses codeFilter for LABOR_ARBITRATION', async () => {
    vi.mocked(prisma.causeOfAction).findMany = vi.fn().mockResolvedValue([]);
    vi.mocked(requireSession).mockResolvedValue({} as any);
    await searchCauses({ category: 'LABOR_ARBITRATION' as any });
    const args = vi.mocked(prisma.causeOfAction).findMany.mock.calls[0][0] as any;
    expect(args.where.category).toBe('CIVIL_COMMERCIAL');
    expect(args.where.OR).toContainEqual({ code: 'CC-7' });
    expect(args.where.OR).toContainEqual({ code: { startsWith: 'CC-7-' } });
  });

  it('uses codeFilter for COMMERCIAL_ARBITRATION', async () => {
    vi.mocked(prisma.causeOfAction).findMany = vi.fn().mockResolvedValue([]);
    vi.mocked(requireSession).mockResolvedValue({} as any);
    await searchCauses({ category: 'COMMERCIAL_ARBITRATION' as any });
    const args = vi.mocked(prisma.causeOfAction).findMany.mock.calls[0][0] as any;
    expect(args.where.category).toBe('CIVIL_COMMERCIAL');
    // Should include multiple CC codes
    expect(args.where.OR).toContainEqual({ code: 'CC-3' });
    expect(args.where.OR).toContainEqual({ code: { startsWith: 'CC-3-' } });
    expect(args.where.OR).toContainEqual({ code: 'CC-4' });
  });
});

describe('getCauseById', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns null when not found', async () => {
    vi.mocked(prisma.causeOfAction).findUnique = vi.fn().mockResolvedValue(null);
    vi.mocked(requireSession).mockResolvedValue({} as any);
    const result = await getCauseById('unknown' as any);
    expect(result).toBeNull();
  });

  it('flattens cause with full parent chain up to level 0', async () => {
    const raw = {
      id: 'c1', code: 'C1', name: 'Child', shortName: 'C', level: 2,
      parentId: 'p1',
      parent: {
        id: 'p1', name: 'Parent', level: 1,
        parent: { id: 'gp1', name: 'Grand', level: 0, parent: null }
      },
      category: 'CIVIL'
    };
    vi.mocked(prisma.causeOfAction).findUnique = vi.fn().mockResolvedValue(raw);
    vi.mocked(requireSession).mockResolvedValue({} as any);
    const result = await getCauseById('c1' as any);
    expect(result).not.toBeNull();
    expect(result!.l1Name).toBe('Parent');
    expect(result!.l2Name).toBe('Child');
    expect(result!.category).toBe('CIVIL');
  });

  it('flattens cause with no parent (level 1)', async () => {
    const raw = {
      id: 'c1', code: 'C1', name: 'Root Cause', shortName: 'R', level: 1,
      parentId: null,
      parent: null,
      category: 'CRIMINAL'
    };
    vi.mocked(prisma.causeOfAction).findUnique = vi.fn().mockResolvedValue(raw);
    vi.mocked(requireSession).mockResolvedValue({} as any);
    const result = await getCauseById('c1' as any);
    expect(result).not.toBeNull();
    expect(result!.l1Name).toBe('Root Cause');
    expect(result!.l2Name).toBeNull();
    expect(result!.category).toBe('CRIMINAL');
  });
});
