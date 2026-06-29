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
