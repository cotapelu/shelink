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
