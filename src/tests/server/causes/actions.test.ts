/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchCauses, getCauseById } from '@/server/causes/actions';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth/session';

vi.mock('@/lib/auth/session');

vi.mock('@/lib/prisma', () => ({
  prisma: {
    causeOfAction: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    }
  }
}));

describe('searchCauses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireSession as any).mockResolvedValue({ user: { id: 'u1' } });
  });

  it('returns level 1 and 2 causes for empty query without codePrefixes', async () => {
    const mockDbResults = [
      {
        id: 'c1',
        code: 'CC-1',
        name: '一级分类',
        shortName: '一级',
        level: 1,
        parentId: null,
        parent: null
      },
      {
        id: 'c2',
        code: 'CC-1-1',
        name: '二级分类',
        shortName: '二级',
        level: 2,
        parentId: 'c1',
        parent: {
          id: 'c1',
          name: '一级分类',
          level: 1,
          parent: null
        }
      }
    ];
    (prisma.causeOfAction.findMany as any).mockResolvedValue(mockDbResults);

    const result = await searchCauses({ category: 'CIVIL_COMMERCIAL' });

    expect(result).toHaveLength(2);
    expect(result[0].l1Name).toBe('一级分类');
    expect(result[0].l2Name).toBeNull();
    expect(result[1].l1Name).toBe('一级分类');
    expect(result[1].l2Name).toBe('二级分类');
  });

  it('applies codePrefixes filter for empty query (labor arbitration)', async () => {
    const mockDbResults = [
      {
        id: 'c1',
        code: 'CC-7',
        name: '劳动争议',
        shortName: '劳',
        level: 2,
        parentId: null,
        parent: null
      }
    ];
    (prisma.causeOfAction.findMany as any).mockResolvedValue(mockDbResults);

    await searchCauses({ category: 'LABOR_ARBITRATION' });

    const where = (prisma.causeOfAction.findMany as any).mock.calls[0][0].where;
    expect(where.category).toBe('CIVIL_COMMERCIAL');
    expect(where.active).toBe(true);
    expect(where.OR).toHaveLength(2);
    expect(where.OR[0]).toEqual({ code: 'CC-7' });
    expect(where.OR[1]).toEqual({ code: { startsWith: 'CC-7-' } });
  });

  it('applies codePrefixes for commercial arbitration', async () => {
    (prisma.causeOfAction.findMany as any).mockResolvedValue([]);

    await searchCauses({ category: 'COMMERCIAL_ARBITRATION' });

    const where = (prisma.causeOfAction.findMany as any).mock.calls[0][0].where;
    expect(where.OR).toHaveLength(12); // 6 prefixes * 2 conditions each
    // Check first prefix CC-3
    expect(where.OR[0]).toEqual({ code: 'CC-3' });
    expect(where.OR[1]).toEqual({ code: { startsWith: 'CC-3-' } });
  });

  it('filters level >= 2 for query searches', async () => {
    (prisma.causeOfAction.findMany as any).mockResolvedValue([]);

    await searchCauses({ category: 'CIVIL_COMMERCIAL', query: 'test' });

    const where = (prisma.causeOfAction.findMany as any).mock.calls[0][0].where;
    expect(where.level.gte).toBe(2);
  });

  it('builds OR condition for name, shortName, keywords, pinyin', async () => {
    (prisma.causeOfAction.findMany as any).mockResolvedValue([]);

    await searchCauses({ category: 'CIVIL_COMMERCIAL', query: '借贷' });

    const where = (prisma.causeOfAction.findMany as any).mock.calls[0][0].where;
    // Without codePrefixes, AND has only the OR object at index 0
    const or = where.AND[0].OR;
    expect(or).toHaveLength(4);
    expect(or[0]).toEqual({ name: { contains: '借贷', mode: 'insensitive' } });
    expect(or[1]).toEqual({ shortName: { contains: '借贷', mode: 'insensitive' } });
    expect(or[2]).toEqual({ keywords: { has: '借贷' } });
    expect(or[3]).toEqual({ pinyin: { contains: '借贷', mode: 'insensitive' } });
  });

  it('combines codePrefixes AND query filters for arbitration with query', async () => {
    (prisma.causeOfAction.findMany as any).mockResolvedValue([]);

    await searchCauses({ category: 'LABOR_ARBITRATION', query: '劳资' });

    const where = (prisma.causeOfAction.findMany as any).mock.calls[0][0].where;
    expect(where.AND).toHaveLength(2);
    expect(where.AND[0].OR).toBeDefined(); // codePrefixes
    expect(where.AND[1].OR).toBeDefined(); // query fields
  });

  it('caps limit at 2000', async () => {
    (prisma.causeOfAction.findMany as any).mockResolvedValue([]);

    await searchCauses({ category: 'CIVIL_COMMERCIAL', limit: 5000 });

    expect((prisma.causeOfAction.findMany as any).mock.calls[0][0].take).toBe(2000);
  });

  it('uses default limit 50 when not specified', async () => {
    (prisma.causeOfAction.findMany as any).mockResolvedValue([]);

    await searchCauses({ category: 'CIVIL_COMMERCIAL' });

    expect((prisma.causeOfAction.findMany as any).mock.calls[0][0].take).toBe(50);
  });

  it('orders by level asc, code asc', async () => {
    (prisma.causeOfAction.findMany as any).mockResolvedValue([]);

    await searchCauses({ category: 'CIVIL_COMMERCIAL' });

    expect((prisma.causeOfAction.findMany as any).mock.calls[0][0].orderBy).toEqual([
      { level: 'asc' },
      { code: 'asc' }
    ]);
  });

  it('returns empty array when no results', async () => {
    (prisma.causeOfAction.findMany as any).mockResolvedValue([]);

    const result = await searchCauses({ category: 'CIVIL_COMMERCIAL', query: 'nomatch' });

    expect(result).toEqual([]);
  });

  it('handles 3-level parent chain correctly in flatten (via result mapping)', async () => {
    const mockDbResult = [{
      id: 'c3',
      code: 'CC-1-1-1',
      name: '三级分类',
      shortName: '三',
      level: 3,
      parentId: 'c2',
      parent: {
        id: 'c2',
        name: '二级分类',
        level: 2,
        parent: {
          id: 'c1',
          name: '一级分类',
          level: 1,
          parent: null
        }
      }
    }];
    (prisma.causeOfAction.findMany as any).mockResolvedValue(mockDbResult);

    const result = await searchCauses({ category: 'CIVIL_COMMERCIAL' });

    expect(result[0].l1Name).toBe('一级分类');
    expect(result[0].l2Name).toBe('二级分类');
  });
});

describe('getCauseById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireSession as any).mockResolvedValue({ user: { id: 'u1' } });
  });

  it('returns flattened cause with category when found', async () => {
    const mockDbResult = {
      id: 'c1',
      code: 'CC-1',
      name: '借贷纠纷',
      shortName: '借贷',
      level: 2,
      parentId: 'c2',
      parent: {
        id: 'c2',
        name: '合同纠纷',
        level: 1,
        parent: null
      },
      category: 'CIVIL_COMMERCIAL'
    };
    (prisma.causeOfAction.findUnique as any).mockResolvedValue(mockDbResult);

    const result = await getCauseById('c1');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('c1');
    expect(result!.name).toBe('借贷纠纷');
    expect(result!.l1Name).toBe('合同纠纷');
    expect(result!.l2Name).toBe('借贷纠纷');
    expect(result!.category).toBe('CIVIL_COMMERCIAL');
  });

  it('returns null when cause not found', async () => {
    (prisma.causeOfAction.findUnique as any).mockResolvedValue(null);

    const result = await getCauseById('nonexistent');

    expect(result).toBeNull();
  });

  it('selects all CAUSE_SELECT fields plus category', async () => {
    (prisma.causeOfAction.findUnique as any).mockResolvedValue(null);

    await getCauseById('c1');

    const select = (prisma.causeOfAction.findUnique as any).mock.calls[0][0].select;
    expect(select.id).toBe(true);
    expect(select.code).toBe(true);
    expect(select.name).toBe(true);
    expect(select.shortName).toBe(true);
    expect(select.level).toBe(true);
    expect(select.parentId).toBe(true);
    expect(select.parent).toBeDefined();
    expect(select.category).toBe(true);
  });
});
