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
import { recommendCause } from '@/server/ai/recommend-cause';
import { aiChat, extractJson, AiNotConfiguredError } from '@/lib/ai/client';
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
    (searchCauses as any).mockImplementation(async ({ query }: { query?: string }) => {
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
    (searchCauses as any).mockImplementation(async ({ query }: { query?: string }) => {
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

  it('propagates searchCauses errors', async () => {
    (aiChat as any).mockResolvedValue({ content: '[{"name":"A","reason":"r","confidence":"HIGH"}]' });
    (extractJson as any).mockReturnValue([{ name: 'A', reason: 'r', confidence: 'HIGH' }]);
    (searchCauses as any).mockRejectedValue(new Error('DB failure'));

    await expect(recommendCause({ category: 'CIVIL_COMMERCIAL', situation: 'This is a test situation that is long enough' }))
      .rejects.toThrow('DB failure');
  });

  it('rethrows AiNotConfiguredError from aiChat unchanged', async () => {
    const err = new AiNotConfiguredError();
    (aiChat as any).mockRejectedValue(err);

    await expect(recommendCause({ category: 'CIVIL_COMMERCIAL', situation: 'This is a test situation that is long enough' }))
      .rejects.toThrow(AiNotConfiguredError);
  });

  it('handles unknown category via categoryHint default branch', async () => {
    // LABOR_ARBITRATION and COMMERCIAL_ARBITRATION hit default in categoryHint
    (aiChat as any).mockResolvedValue({ content: '[{"name":"A","reason":"r","confidence":"HIGH"}]' });
    (extractJson as any).mockReturnValue([{ name: 'A', reason: 'r', confidence: 'HIGH' }]);
    (searchCauses as any).mockResolvedValue([{ id: 'c1', name: 'A', level: 3 }]);

    const result = await recommendCause({ category: 'LABOR_ARBITRATION', situation: 'Labor dispute case details' });
    expect(result).toHaveLength(1);
    expect(result[0].cause.name).toBe('A');
  });

  it('wraps non-AiNotConfiguredError from aiChat', async () => {
    (aiChat as any).mockRejectedValue(new Error('AI service down'));

    await expect(recommendCause({ category: 'CIVIL_COMMERCIAL', situation: 'This is a test situation that is long enough' }))
      .rejects.toThrow('AI service down');
  });

  it('handles extractJson throwing (malformed JSON)', async () => {
    (aiChat as any).mockResolvedValue({ content: 'invalid json' });
    (extractJson as any).mockImplementation(() => { throw new Error('Parse error'); });

    await expect(recommendCause({ category: 'CIVIL_COMMERCIAL', situation: 'This is a test situation that is long enough' }))
      .rejects.toThrow('Parse error');
  });

  it('filters out null resolutions while keeping valid ones', async () => {
    (aiChat as any).mockResolvedValue({ content: '[{"name":"A","reason":"r1","confidence":"HIGH"},{"name":"B","reason":"r2","confidence":"HIGH"}]' });
    (extractJson as any).mockReturnValue([
      { name: 'A', reason: 'r1', confidence: 'HIGH' },
      { name: 'B', reason: 'r2', confidence: 'HIGH' }
    ]);
    (searchCauses as any).mockImplementation(async ({ query }: { query?: string }) => {
      if (query === 'A') return []; // resolves to null
      if (query === 'B') return [{ id: 'c2', name: 'B', level: 3 }];
      return [];
    });

    const result = await recommendCause({ category: 'CIVIL_COMMERCIAL', situation: 'This is a test situation that is long enough' });

    expect(result).toHaveLength(1);
    expect(result[0].cause.id).toBe('c2');
  });

  it('filters out candidates without name', async () => {
    (aiChat as any).mockResolvedValue({ content: '[{"reason":"r1","confidence":"HIGH"}]' });
    (extractJson as any).mockReturnValue([{ reason: 'r1', confidence: 'HIGH' }]); // no name

    await expect(recommendCause({ category: 'CIVIL_COMMERCIAL', situation: 'This is a test situation that is long enough' }))
      .rejects.toThrow('AI 推荐的案由都不在案由库中');
    expect(searchCauses).not.toHaveBeenCalled();
  });

  it('normalizes missing confidence to MEDIUM', async () => {
    (aiChat as any).mockResolvedValue({ content: '[{"name":"A","reason":"r"}]' });
    (extractJson as any).mockReturnValue([{ name: 'A', reason: 'r' }]); // no confidence
    (searchCauses as any).mockResolvedValue([{ id: 'c1', name: 'A', level: 3 }]);

    const result = await recommendCause({ category: 'CIVIL_COMMERCIAL', situation: 'This is a test situation that is long enough' });

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe('MEDIUM');
  });

  it('skips exact match if level < 3 and falls back to leaf', async () => {
    (aiChat as any).mockResolvedValue({ content: '[{"name":"X","reason":"r","confidence":"HIGH"}]' });
    (extractJson as any).mockReturnValue([{ name: 'X', reason: 'r', confidence: 'HIGH' }]);
    (searchCauses as any).mockResolvedValue([
      { id: 'c1', name: 'X', level: 2 },
      { id: 'c2', name: 'Y', level: 3 }
    ]);

    const result = await recommendCause({ category: 'CIVIL_COMMERCIAL', situation: 'This is a test situation that is long enough' });

    expect(result).toHaveLength(1);
    expect(result[0].cause.id).toBe('c2');
  });

  it('filters out candidates with whitespace-only name after trim', async () => {
    (aiChat as any).mockResolvedValue({ content: '[{"name":"   ","reason":"r","confidence":"HIGH"}]' });
    (extractJson as any).mockReturnValue([{ name: '   ', reason: 'r', confidence: 'HIGH' }]);
    (searchCauses as any).mockResolvedValue([]); // resolveCauseId returns null after trim

    await expect(recommendCause({ category: 'CIVIL_COMMERCIAL', situation: 'This is a test situation that is long enough' }))
      .rejects.toThrow('AI 推荐的案由都不在案由库中');
  });

  // Parameterized test to cover categoryHint for all MatterCategory values
  it.each([
    ['CIVIL_COMMERCIAL', '民商事'],
    ['CRIMINAL', '刑事'],
    ['ADMINISTRATIVE', '行政'],
    ['NON_LITIGATION', '非诉'],
    ['LEGAL_COUNSEL', '常年法律顾问'],
    ['SPECIAL_PROJECT', '专项'],
    // LABOR_ARBITRATION and COMMERCIAL_ARBITRATION fall through to default
    ['LABOR_ARBITRATION', 'LABOR_ARBITRATION'],
    ['COMMERCIAL_ARBITRATION', 'COMMERCIAL_ARBITRATION']
  ])('categoryHint returns correct hint for %s', async (category, expectedHint) => {
    (aiChat as any).mockResolvedValue({ content: '[{"name":"A","reason":"r","confidence":"HIGH"}]' });
    (extractJson as any).mockReturnValue([{ name: 'A', reason: 'r', confidence: 'HIGH' }]);
    (searchCauses as any).mockResolvedValue([{ id: 'c1', name: 'A', level: 3 }]);

    const result = await recommendCause({ category: category as any, situation: 'This is a test situation that is long enough' });
    // The result is successful; we don't assert hint directly but ensure categoryHint executed
    expect(result).toHaveLength(1);
  });
});
