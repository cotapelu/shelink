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
import { getSession, requireSession } from '@/lib/auth/session';
import { authOptions } from '@/lib/auth/options';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn()
}));

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

describe('getSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns session when user is logged in', async () => {
    const mockSession = { user: { id: 'u1', name: 'Test', email: 'test@example.com', role: 'LAWYER' } };
    (getServerSession as any).mockResolvedValue(mockSession);

    const result = await getSession();

    expect(getServerSession).toHaveBeenCalledWith(authOptions);
    expect(result).toEqual(mockSession);
  });

  it('returns null when no session', async () => {
    (getServerSession as any).mockResolvedValue(null);

    const result = await getSession();

    expect(result).toBeNull();
  });

  it('returns session without user property (edge case)', async () => {
    const mockSession = { token: 'abc' };
    (getServerSession as any).mockResolvedValue(mockSession);

    const result = await getSession();

    expect(result).toEqual(mockSession);
  });
});

describe('requireSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns session when user is logged in', async () => {
    const mockSession = { user: { id: 'u1', name: 'Test', email: 'test@example.com', role: 'LAWYER' } };
    (getServerSession as any).mockResolvedValue(mockSession);

    const result = await requireSession();

    expect(getServerSession).toHaveBeenCalledWith(authOptions);
    expect(redirect).not.toHaveBeenCalled();
    expect(result).toEqual(mockSession);
  });

  it('redirects to /login when no session', async () => {
    (getServerSession as any).mockResolvedValue(null);

    await requireSession();

    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('redirects when session exists but no user', async () => {
    (getServerSession as any).mockResolvedValue({ token: 'abc' });

    await requireSession();

    expect(redirect).toHaveBeenCalledWith('/login');
  });
});
