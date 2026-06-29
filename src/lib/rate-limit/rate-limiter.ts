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
