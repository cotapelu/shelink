/**
 * Rate limiter using Token Bucket algorithm
 *
 * Token Bucket:
 * - Bucket has capacity (max tokens)
 * - Tokens refill at constant rate (tokens per second)
 * - Each request consumes 1 token
 * - If bucket empty → reject (429 Too Many Requests)
 *
 * Allows burst traffic up to capacity, then smooths to rate limit.
 */

import { checkRateLimit, getRemainingTokens } from './memory-store';

export interface RateLimitConfig {
  maxRequests: number; // bucket capacity
  windowMs: number; // time window in ms (used to calculate refill rate)
}

/**
 * Check if request is allowed by rate limit
 * @param identifier Unique identifier (e.g., IP+endpoint)
 * @param config Rate limit config
 * @returns true if allowed, false if limited
 */
export function isAllowed(identifier: string, config: RateLimitConfig): boolean {
  if (config.maxRequests <= 0) return true; // unlimited

  const refillRate = config.maxRequests / (config.windowMs / 1000); // tokens per second
  return checkRateLimit(identifier, config.maxRequests, refillRate);
}

/**
 * Get remaining tokens for identifier (for debugging/headers)
 */
export function getTokens(identifier: string, config: RateLimitConfig): number {
  if (config.maxRequests <= 0) return Infinity;
  const refillRate = config.maxRequests / (config.windowMs / 1000);
  return getRemainingTokens(identifier, config.maxRequests, refillRate);
}

/**
 * Reset rate limit for identifier (admin operation)
 */
export function reset(identifier: string): void {
  // Not implemented in memory store (would need delete)
  // For Redis, you'd DEL key
}
