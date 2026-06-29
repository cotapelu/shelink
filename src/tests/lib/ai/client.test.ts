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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  aiChat,
  aiVision,
  extractJson,
  AiNotConfiguredError
} from '@/lib/ai/client';
import { getAiSettings } from '@/lib/ai/settings';

vi.mock('@/lib/ai/settings');

const mockSettings = {
  configured: true,
  apiKey: 'test-api-key',
  baseUrl: 'https://api.openai.com/v1',
  textModel: 'gpt-4',
  visionModel: 'gpt-4-vision'
};

describe('aiChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAiSettings as any).mockResolvedValue(mockSettings);
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('throws AiNotConfiguredError when AI not configured', async () => {
    (getAiSettings as any).mockResolvedValue({ ...mockSettings, configured: false });
    await expect(
      aiChat({ messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow(AiNotConfiguredError);
  });

  it('calls fetch with correct URL, headers, and body', async () => {
    const mockFetch = vi.mocked(globalThis.fetch as any);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Hello' } }] })
    } as Response);

    const result = await aiChat({ messages: [{ role: 'user', content: 'hi' }] });

    expect(result.content).toBe('Hello');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers.Authorization).toBe('Bearer test-api-key');
    const body = JSON.parse(options.body);
    expect(body.model).toBe('gpt-4');
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
    expect(body.max_tokens).toBe(1500);
    expect(body.temperature).toBe(0.2);
  });

  it('returns empty content when choices array missing', async () => {
    const mockFetch = vi.mocked(globalThis.fetch as any);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({})
    } as Response);

    const result = await aiChat({ messages: [{ role: 'user', content: 'hi' }] });
    expect(result.content).toBe('');
  });

  it('throws on non-ok response with error snippet', async () => {
    const mockFetch = vi.mocked(globalThis.fetch as any);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Invalid API key'
    } as Response);

    await expect(
      aiChat({ messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow('AI 请求失败 (401): Invalid API key');
  });

  it('throws on network error', async () => {
    const mockFetch = vi.mocked(globalThis.fetch as any);
    mockFetch.mockRejectedValue(new Error('Network failure'));

    await expect(
      aiChat({ messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow('Network failure');
  });

  it('handles response with choices but missing message content', async () => {
    const mockFetch = vi.mocked(globalThis.fetch as any);
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ choices: [{}] }) } as Response);
    const result = await aiChat({ messages: [{ role: 'user', content: 'hi' }] });
    expect(result.content).toBe('');
  });

  it('uses custom model, maxTokens, temperature', async () => {
    const mockFetch = vi.mocked(globalThis.fetch as any);
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) } as Response);
    await aiChat({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'gpt-4-turbo',
      maxTokens: 500,
      temperature: 0.5
    });
    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.model).toBe('gpt-4-turbo');
    expect(body.max_tokens).toBe(500);
    expect(body.temperature).toBe(0.5);
  });

});

describe('aiVision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAiSettings as any).mockResolvedValue(mockSettings);
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses dataUrl when image.dataUrl provided', async () => {
    const mockFetch = vi.mocked(globalThis.fetch as any);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'vision' } }] })
    } as Response);

    await aiVision({
      image: { dataUrl: 'data:image/png;base64,abc' },
      prompt: 'describe'
    });

    const [url, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.messages[0].content).toEqual([
      { type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } },
      { type: 'text', text: 'describe' }
    ]);
  });

  it('uses url when image.url provided', async () => {
    const mockFetch = vi.mocked(globalThis.fetch as any);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'vision' } }] })
    } as Response);

    await aiVision({
      image: { url: 'https://example.com/image.jpg' },
      prompt: 'describe'
    });

    const [url, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.messages[0].content).toEqual([
      { type: 'image_url', image_url: { url: 'https://example.com/image.jpg' } },
      { type: 'text', text: 'describe' }
    ]);
  });

  it('throws if not configured', async () => {
    (getAiSettings as any).mockResolvedValue({ ...mockSettings, configured: false });
    await expect(
      aiVision({
        image: { url: 'https://example.com/image.jpg' },
        prompt: 'describe'
      })
    ).rejects.toThrow(AiNotConfiguredError);
  });

  it('uses custom model and timeout', async () => {
    const mockFetch = vi.mocked(globalThis.fetch as any);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'vision' } }] })
    } as Response);
    await aiVision({
      image: { url: 'https://example.com/image.jpg' },
      prompt: 'describe',
      model: 'gpt-4-vision-preview',
      timeoutMs: 5000
    });
    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.model).toBe('gpt-4-vision-preview');
  });

});

describe('extractJson', () => {
  it('extracts JSON from fenced code block with json language', () => {
    const content = 'Here is JSON:\n```json\n{ "key": "value" }\n```';
    const result = extractJson<{ key: string }>(content);
    expect(result).toEqual({ key: 'value' });
  });

  it('extracts JSON from fenced block without language', () => {
    const content = '```\n[1,2,3]\n```';
    expect(extractJson<number[]>(content)).toEqual([1, 2, 3]);
  });

  it('extracts JSON without fences', () => {
    const content = 'Some text { "a": 1 } more text';
    expect(extractJson<{ a: number }>(content)).toEqual({ a: 1 });
  });

  it('returns null if no JSON pattern', () => {
    const content = 'Just plain text';
    expect(extractJson(content)).toBeNull();
  });

  it('returns null if JSON parse fails', () => {
    const content = '```{ invalid json }```';
    expect(extractJson(content)).toBeNull();
  });
});
