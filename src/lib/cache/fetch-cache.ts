/*
 * Simple in-memory cache for fetch operations
 * Used for caching expensive API calls or computed data
 *
 * TODO: In production, replace with Redis or distributed cache
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  staleAt?: number; // for stale-while-revalidate
}

const cache = new Map<string, CacheEntry<any>>();

/**
 * Set a cache entry with TTL (milliseconds)
 * Default TTL: 5 minutes
 */
export function setCache<T>(key: string, value: T, ttlMs?: number, staleTtlMs?: number): void {
  const now = Date.now();
  const expiresAt = now + (ttlMs ?? 5 * 60 * 1000); // 5 min default
  const staleAt = staleTtlMs ? now + staleTtlMs : undefined;
  cache.set(key, { value, expiresAt, staleAt });
}

/**
 * Get a cache entry if not expired
 */
export function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Get cache entry even if stale (for background refresh)
 */
export function getStaleCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  return entry.value;
}

/**
 * Check if cache entry exists and is stale (expired but within stale window)
 */
export function hasStaleCache(key: string): boolean {
  const entry = cache.get(key);
  if (!entry) return false;

  const now = Date.now();
  if (now > entry.expiresAt) {
    // Check if within stale window
    if (entry.staleAt && now <= entry.staleAt) {
      return true;
    }
    cache.delete(key);
    return false;
  }
  return false;
}

/**
 * Delete a cache entry
 */
export function deleteCache(key: string): void {
  cache.delete(key);
}

/**
 * Clear entire cache (emergency use)
 */
export function clearCache(): void {
  cache.clear();
}
