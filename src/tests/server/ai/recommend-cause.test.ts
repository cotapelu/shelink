/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recommendCause } from '@/server/ai/recommend-cause';
import { aiChat, extractJson } from '@/lib/ai/client';
import { searchCauses } from '@/server/causes/actions';
import { requireSession } from '@/lib/auth/session';

vi.mock('@/lib/ai/client');
vi.mock('@/server/causes/actions');
vi.mock('@/lib/auth/session');

describe('recommendCause', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireSession as any).mockResolvedValue({ user: { id: 'u1' } });
  });

  it('throws if situation too short', async () => {
    await expect(recommendCause({ category: 'CIVIL_COMMERCIAL', situation: 'abc' }))
      .rejects.toThrow('案情描述太短，至少 5 个字');
  });

  it('throws if AI returns non-array parsed content', async () => {
    (aiChat as any).mockResolvedValue({ content: '{"not":"array"}' });
    (extractJson as any).mockReturnValue({ not: 'array' });

    await expect(recommendCause({ category: 'CIVIL_COMMERCIAL', situation: 'This is a test situation that is long enough' }))
      .rejects.toThrow('AI 返回内容无法解析为候选列表');
  });

  it('throws if all resolved causes are null', async () => {
    (aiChat as any).mockResolvedValue({ content: '[{"name":"Test","reason":"...","confidence":"HIGH"}]' });
    (extractJson as any).mockReturnValue([{ name: 'Test', reason: '...', confidence: 'HIGH' }]);
    (searchCauses as any).mockResolvedValue([]); // all resolve to null

    await expect(recommendCause({ category: 'CIVIL_COMMERCIAL', situation: 'This is a test situation that is long enough' }))
      .rejects.toThrow('AI 推荐的案由都不在案由库中');
  });

  it('filters duplicates and respects max 3 results', async () => {
    (aiChat as any).mockResolvedValue({ content: '[{"name":"A","reason":"r1","confidence":"HIGH"},{"name":"B","reason":"r2","confidence":"HIGH"},{"name":"C","reason":"r3","confidence":"HIGH"}]' });
    (extractJson as any).mockReturnValue([
      { name: 'A', reason: 'r1', confidence: 'HIGH' },
      { name: 'B', reason: 'r2', confidence: 'HIGH' },
      { name: 'C', reason: 'r3', confidence: 'HIGH' }
    ]);
    (searchCauses as any).mockImplementation(async ({ query }) => {
      if (query === 'A') return [{ id: 'c1', name: 'A', level: 3 }];
      if (query === 'B') return [{ id: 'c2', name: 'B', level: 3 }];
      if (query === 'C') return [{ id: 'c3', name: 'C', level: 3 }];
      return [];
    });

    const result = await recommendCause({ category: 'CIVIL_COMMERCIAL', situation: 'This is a test situation that is long enough' });

    expect(result).toHaveLength(3);
    expect(result[0].cause.id).toBe('c1');
    expect(result[1].cause.id).toBe('c2');
    expect(result[2].cause.id).toBe('c3');
  });

  it('deduplicates candidates resolving to same cause', async () => {
    (aiChat as any).mockResolvedValue({ content: '[{"name":"A","reason":"r1","confidence":"HIGH"},{"name":"A","reason":"r2","confidence":"HIGH"}]' });
    (extractJson as any).mockReturnValue([
      { name: 'A', reason: 'r1', confidence: 'HIGH' },
      { name: 'A', reason: 'r2', confidence: 'HIGH' }
    ]);
    (searchCauses as any).mockResolvedValue([{ id: 'c1', name: 'A', level: 3 }]);

    const result = await recommendCause({ category: 'CIVIL_COMMERCIAL', situation: 'This is a test situation that is long enough' });

    expect(result).toHaveLength(1);
    expect(result[0].cause.id).toBe('c1');
  });

  it('filters out causes with level < 3 and falls back to first leaf', async () => {
    (aiChat as any).mockResolvedValue({ content: '[{"name":"借贷纠纷","reason":"r1","confidence":"HIGH"}]' });
    (extractJson as any).mockReturnValue([{ name: '借贷纠纷', reason: 'r1', confidence: 'HIGH' }]);
    (searchCauses as any).mockResolvedValue([
      { id: 'c1', name: '合同纠纷', level: 2 },
      { id: 'c2', name: '民间借贷纠纷', level: 3 }
    ]);

    const result = await recommendCause({ category: 'CIVIL_COMMERCIAL', situation: 'This is a test situation that is long enough' });

    expect(result).toHaveLength(1);
    expect(result[0].cause.id).toBe('c2'); // first level>=3, not the level<2 one
  });

  it('stops early when reaching 3 results', async () => {
    (aiChat as any).mockResolvedValue({ content: '[{"name":"A","reason":"r1","confidence":"HIGH"},{"name":"B","reason":"r2","confidence":"HIGH"},{"name":"C","reason":"r3","confidence":"HIGH"},{"name":"D","reason":"r4","confidence":"HIGH"}]' });
    (extractJson as any).mockReturnValue([
      { name: 'A', reason: 'r1', confidence: 'HIGH' },
      { name: 'B', reason: 'r2', confidence: 'HIGH' },
      { name: 'C', reason: 'r3', confidence: 'HIGH' },
      { name: 'D', reason: 'r4', confidence: 'HIGH' }
    ]);
    (searchCauses as any).mockImplementation(async ({ query }) => {
      if (query === 'A') return [{ id: 'c1', name: 'A', level: 3 }];
      if (query === 'B') return [{ id: 'c2', name: 'B', level: 3 }];
      if (query === 'C') return [{ id: 'c3', name: 'C', level: 3 }];
      if (query === 'D') return [{ id: 'c4', name: 'D', level: 3 }];
      return [];
    });

    const result = await recommendCause({ category: 'CIVIL_COMMERCIAL', situation: 'This is a test situation that is long enough' });

    expect(result).toHaveLength(3);
    // D should not be processed because we stop at 3
    expect(result.map(r => r.cause.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('handles unknown confidence values by normalizing to MEDIUM', async () => {
    (aiChat as any).mockResolvedValue({ content: '[{"name":"A","reason":"r1","confidence":"INVALID"}]' });
    (extractJson as any).mockReturnValue([{ name: 'A', reason: 'r1', confidence: 'INVALID' }]);
    (searchCauses as any).mockResolvedValue([{ id: 'c1', name: 'A', level: 3 }]);

    const result = await recommendCause({ category: 'CIVIL_COMMERCIAL', situation: 'This is a test situation that is long enough' });

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe('MEDIUM');
  });

  it('returns correct confidence for valid values', async () => {
    (aiChat as any).mockResolvedValue({ content: '[{"name":"A","reason":"r1","confidence":"HIGH"},{"name":"B","reason":"r2","confidence":"LOW"}]' });
    (extractJson as any).mockReturnValue([
      { name: 'A', reason: 'r1', confidence: 'HIGH' },
      { name: 'B', reason: 'r2', confidence: 'LOW' }
    ]);
    (searchCauses as any).mockResolvedValue([
      { id: 'c1', name: 'A', level: 3 },
      { id: 'c2', name: 'B', level: 3 }
    ]);

    const result = await recommendCause({ category: 'CIVIL_COMMERCIAL', situation: 'This is a test situation that is long enough' });

    expect(result).toHaveLength(2);
    expect(result[0].confidence).toBe('HIGH');
    expect(result[1].confidence).toBe('LOW');
  });
});
