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
 * Client-side auth storage utilities
 *
 * Manages authentication tokens in localStorage for client-side access.
 * Uses httpOnly cookies for sensitive tokens on server side.
 */

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';

/**
 * Store access token in localStorage
 */
export function setAccessToken(token: string): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    // localStorage might be unavailable
    console.warn('[auth storage] localStorage unavailable');
  }
}

/**
 * Get access token from localStorage
 */
export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Remove access token
 */
export function removeAccessToken(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Store refresh token in localStorage
 */
export function setRefreshToken(token: string): void {
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch {
    console.warn('[auth storage] localStorage unavailable');
  }
}

/**
 * Get refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Remove refresh token
 */
export function removeRefreshToken(): void {
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Store user info in localStorage
 */
export function setUser(user: unknown): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    console.warn('[auth storage] localStorage unavailable');
  }
}

/**
 * Get user info from localStorage
 */
export function getUser(): unknown {
  try {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Clear all auth data from localStorage
 */
export function clearAuth(): void {
  removeAccessToken();
  removeRefreshToken();
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

/**
 * Get token (alias for getAccessToken for backward compatibility)
 */
export function getToken(): string | null {
  return getAccessToken();
}

/**
 * Alias for setAccessToken (backward compatibility)
 */
export function setToken(token: string): void {
  setAccessToken(token);
}
