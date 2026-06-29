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
/**
 * CSRF Token management for Next.js Server Actions
 *
 * Provides CSRF token generation, validation, and cookie management
 * for protecting against cross-site request forgery attacks.
 *
 * Testability: Functions accept optional store parameters for unit testing.
 */

import { cookies, headers } from 'next/headers';
import crypto from 'node:crypto';

// Cookie names
const CSRF_TOKEN_COOKIE = 'csrf_token';

function getCsrfCookieOptions(): Record<string, any> {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  };
}

/**
 * Cookie store interface (mimics Next.js CookieStore)
 */
export interface TestableCookieStore {
  set: (name: string, value: string, options?: any) => void;
  get: (name: string) => { value?: string } | undefined;
  delete: (name: string) => void;
}

/**
 * Header store interface (mimics Next.js HeaderStore)
 */
export interface TestableHeaderStore {
  get: (name: string) => string | null;
}

/**
 * Generate secure CSRF token
 */
function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate and set CSRF token in cookie
 * @param cookieStore - Optional for testing; defaults to cookies()
 */
export async function setCsrfToken(cookieStore?: TestableCookieStore): Promise<string> {
  const token = generateCsrfToken();
  const store = cookieStore ?? await cookies();
  store.set(CSRF_TOKEN_COOKIE, token, getCsrfCookieOptions());
  return token;
}

/**
 * Get CSRF token from cookie
 * @param cookieStore - Optional for testing; defaults to cookies()
 */
export async function getCsrfToken(cookieStore?: TestableCookieStore): Promise<string | undefined> {
  const store = cookieStore ?? await cookies();
  return store.get(CSRF_TOKEN_COOKIE)?.value;
}

/**
 * Verify CSRF token from cookie vs header
 * @param cookieStore - Optional for testing; defaults to cookies()
 * @param headerStore - Optional for testing; defaults to headers()
 */
export async function verifyCsrfToken(
  cookieStore?: TestableCookieStore,
  headerStore?: TestableHeaderStore
): Promise<boolean> {
  const cookie = cookieStore ?? await cookies();
  const cookieToken = cookie.get(CSRF_TOKEN_COOKIE)?.value;
  const resolvedHeaderStore = headerStore ?? await headers();
  const headerToken = resolvedHeaderStore.get('x-csrf-token');

  if (!cookieToken || !headerToken) {
    return false;
}

  // Timing-safe comparison
  const cookieBuf = Buffer.from(cookieToken);
  const headerBuf = Buffer.from(headerToken);
  if (cookieBuf.length !== headerBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(cookieBuf, headerBuf);
}

/**
 * Clear CSRF token cookie
 * @param cookieStore - Optional for testing; defaults to cookies()
 */
export async function clearCsrfToken(cookieStore?: TestableCookieStore): Promise<void> {
  const store = cookieStore ?? await cookies();
  store.delete(CSRF_TOKEN_COOKIE);
}
