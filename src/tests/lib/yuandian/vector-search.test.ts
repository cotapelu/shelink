/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  searchCasesByVector,
  buildVectorCaseDetailUrl,
  YuandianNotConfiguredError,
  YuandianApiError
} from '@/lib/yuandian/client';
import { getYuandianSettings } from '@/lib/yuandian/settings';

vi.mock('@/lib/yuandian/settings', () => ({
  getYuandianSettings: vi.fn()
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

global.fetch = vi.fn();

describe('searchCasesByVector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws YuandianNotConfiguredError when not configured', async () => {
    (getYuandianSettings as any).mockResolvedValue({ configured: false, apiKey: '', baseUrl: '', caseDetailHost: '' });

    await expect(
      searchCasesByVector({ query: 'test' })
    ).rejects.toThrow(YuandianNotConfiguredError);
  });

  it('throws error when query is empty or whitespace', async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: 'key',
      baseUrl: 'https://open.chineselaw.com/open',
      caseDetailHost: 'https://www.chineselaw.com'
    });

    await expect(searchCasesByVector({ query: '   ' })).rejects.toThrow('query 不能为空');
    await expect(searchCasesByVector({ query: '' })).rejects.toThrow('query 不能为空');
  });

  it('constructs correct request body with all filters', async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: 'test-key',
      baseUrl: 'https://open.chineselaw.com/open',
      caseDetailHost: 'https://www.chineselaw.com'
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 201,
        extra: { wenshu: [{ scid: '1', title: 'Case', ay: ['123'], jbdw: '', ajlb: '', wszl: '', xzqh_p: '', xzqh_c: '', cj: '', jaDate: 0, jand: 0, content: '', score: 0 }] }
      })
    });

    await searchCasesByVector({
      query: '合同纠纷',
      ay: ['民商诉讼'],
      ajlb: '民事案件',
      xzqh_p: '北京',
      wszl: ['判决书'],
      ja_start: '2023-01-01',
      ja_end: '2023-12-31',
      return_num: 30
    });

    const fetchCall = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.query).toBe('合同纠纷');
    expect(body.wenshu_filter).toEqual({
      ay: ['民商诉讼'],
      wenshu_type: '民事案件',
      xzqh_p: '北京',
      wszl: ['1'], // 判决书 code
      ja_start: '2023-01-01',
      ja_end: '2023-12-31'
    });
    expect(body.return_num).toBe(30);
    expect(body.rewrite_flag).toBe(false);
  });

  it('clamps return_num between 1 and 50', async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: 'key',
      baseUrl: 'https://open.chineselaw.com/open',
      caseDetailHost: 'https://www.chineselaw.com'
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ code: 201, extra: { wenshu: [] } })
    });

    await searchCasesByVector({ query: 'test', return_num: 100 });
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.return_num).toBe(50);

    await searchCasesByVector({ query: 'test', return_num: 0 });
    const body2 = JSON.parse((global.fetch as any).mock.calls[1][1].body);
    expect(body2.return_num).toBe(1);
  });

  it('handles HTTP error response', async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: 'key',
      baseUrl: 'https://open.chineselaw.com/open',
      caseDetailHost: 'https://www.chineselaw.com'
    });

    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 502
    });

    await expect(searchCasesByVector({ query: 'test' })).rejects.toThrow(YuandianApiError);
    const err = await searchCasesByVector({ query: 'test' }).catch(e => e);
    expect(err.code).toBe(502);
  });

  it('handles non-success code in response', async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: 'key',
      baseUrl: 'https://open.chineselaw.com/open',
      caseDetailHost: 'https://www.chineselaw.com'
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ code: 500, msg: 'Internal error' })
    });

    await expect(searchCasesByVector({ query: 'test' })).rejects.toThrow(YuandianApiError);
    const err = await searchCasesByVector({ query: 'test' }).catch(e => e);
    expect(err.code).toBe(500);
  });

  it('returns empty items when extra.wenshu is null', async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: 'key',
      baseUrl: 'https://open.chineselaw.com/open',
      caseDetailHost: 'https://www.chineselaw.com'
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ code: 201, extra: { wenshu: null } })
    });

    const result = await searchCasesByVector({ query: 'test' });
    expect(result).toEqual({ items: [] });
  });

  it('returns empty items when extra is missing', async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: 'key',
      baseUrl: 'https://open.chineselaw.com/open',
      caseDetailHost: 'https://www.chineselaw.com'
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ code: 201 })
    });

    const result = await searchCasesByVector({ query: 'test' });
    expect(result).toEqual({ items: [] });
  });

  it('uses default settings when resolved not provided', async () => {
    (getYuandianSettings as any).mockResolvedValue({
      configured: true,
      apiKey: 'default-key',
      baseUrl: 'https://default.open.chineselaw.com/open',
      caseDetailHost: 'https://default.chineselaw.com'
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ code: 201, extra: { wenshu: [] } })
    });

    await searchCasesByVector({ query: 'test' });

    const fetchCall = (global.fetch as any).mock.calls[0];
    expect(fetchCall[0]).toBe('https://default.open.chineselaw.com/open/case_vector_search');
  });
});

describe('buildVectorCaseDetailUrl', () => {
  it('constructs correct URL', () => {
    const url = buildVectorCaseDetailUrl('https://www.chineselaw.com', 'abc123');
    expect(url).toBe('https://www.chineselaw.com/ydzk/caseDetail/case/abc123');
  });

  it('handles trailing slash in host', () => {
    const url = buildVectorCaseDetailUrl('https://www.chineselaw.com/', 'abc123');
    expect(url).toBe('https://www.chineselaw.com/ydzk/caseDetail/case/abc123');
  });
});
