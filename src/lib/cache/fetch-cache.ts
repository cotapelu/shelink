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
 * Fallback Cache for API GET requests
 * Provides stale cache when network fails (resilience)
 *
 * Uses in-memory store with TTL
 * In production, consider Redis or distributed cache
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: unknown; expiresAt: number }>();

/**
 * Set cache entry
 */
export function setCache(key: string, data: unknown, ttl: number = CACHE_TTL): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

/**
 * Get cache entry if not expired
 */
export function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    // Do not delete; return null to indicate expired (fresh miss)
    return null;
  }
  return entry.data as T;
}

/**
 * Check if key exists in cache (even if expired)
 */
export function hasStaleCache(key: string): boolean {
  const entry = cache.get(key);
  if (!entry) return false;
  return Date.now() > entry.expiresAt;
}

/**
 * Get stale cache (expired but available for fallback)
 */
export function getStaleCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  // Return even if expired (fallback only)
  return entry.data as T;
}

/**
 * Clear cache for a key
 */
export function clearCache(key: string): void {
  cache.delete(key);
}

/**
 * Clear all cache (admin operation)
 */
export function clearAllCache(): void {
  cache.clear();
}

/**
 * Cache wrapper for API calls
 * Usage: wrap GET requests with cache key
 */
export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<{ data?: T; error?: string; status?: number }>,
  options: { useCache?: boolean; bypassCache?: boolean } = {}
): Promise<{ data?: T; error?: string; status?: number; fromCache?: boolean }> {
  const { useCache = true, bypassCache = false } = options;

  if (!useCache) {
    const directResult = await fetchFn();
    return { ...directResult, fromCache: false };
  }

  // Try fresh cache first (unless bypassCache)
  if (!bypassCache) {
    const fresh = getCache<T>(key);
    if (fresh !== null) {
      return { data: fresh, fromCache: true };
    }
  }

  // Fetch from network
  let result: { data?: T; error?: string; status?: number };
  try {
    result = await fetchFn();
  } catch (err) {
    result = {
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Determine if result is successful (has data and no error)
  const isSuccess = !result.error && result.data !== undefined;

  if (isSuccess) {
    // Cache successful response
    setCache(key, result.data!);
    return { ...result, fromCache: false };
  }

  // On failure, try stale cache as fallback if available
  if (hasStaleCache(key)) {
    const stale = getStaleCache<T>(key);
    if (stale !== null) {
      console.warn(`[Cache] Returning stale data for ${key} due to network error`);
      return { data: stale, fromCache: true, error: result.error };
    }
  }

  // No fallback, return the error result
  return { ...result, fromCache: false };
}
