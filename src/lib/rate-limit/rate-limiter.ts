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
export function reset(_identifier: string): void {
  void _identifier;
  // Not implemented in memory store (would need delete)
  // For Redis, you'd DEL key
}
