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
 * In-memory store for rate limiting (development only)
 * In production, use Redis or distributed store
 */

interface RateLimitRecord {
  bucket: number; // tokens
  lastRefill: number; // timestamp
}

const store = new Map<string, RateLimitRecord>();

/**
 * Clean up old entries periodically (called on access)
 */
function cleanup(olderThanMs: number = 60 * 60 * 1000): void {
  const now = Date.now();
  for (const [key, record] of store) {
    if (now - record.lastRefill > olderThanMs) {
      store.delete(key);
    }
  }
}

/**
 * Get or create record for key
 */
function getRecord(key: string): RateLimitRecord {
  let record = store.get(key);
  if (!record) {
    record = { bucket: 0, lastRefill: Date.now() };
    store.set(key, record);
  }
  return record;
}

/**
 * Update record
 */
function setRecord(key: string, record: RateLimitRecord): void {
  store.set(key, record);
}

/**
 * Rate limit check using Token Bucket algorithm
 * @param key Unique identifier (e.g., IP+endpoint)
 * @param capacity Max tokens (burst)
 * @param refillRate Tokens per second
 * @returns true if allowed, false if limited
 */
export function checkRateLimit(key: string, capacity: number, refillRate: number): boolean {
  cleanup();

  const now = Date.now();
  let record = store.get(key);

  if (!record) {
    // Initialize with full bucket
    record = { bucket: capacity, lastRefill: now };
  } else {
    // Refill tokens based on time passed
    const elapsed = (now - record.lastRefill) / 1000;
    const newTokens = elapsed * refillRate;
    record.bucket = Math.min(capacity, record.bucket + newTokens);
    record.lastRefill = now;
  }

  if (record.bucket >= 1) {
    record.bucket -= 1; // consume one token
    store.set(key, record);
    return true;
  }

  store.set(key, record);
  return false;
}

/**
 * Get remaining tokens for key (for debugging/metrics)
 */
export function getRemainingTokens(key: string, capacity: number, refillRate: number): number {
  const now = Date.now();
  const record = store.get(key);

  if (!record) {
    return capacity; // full bucket for new identifier
  }

  const elapsed = (now - record.lastRefill) / 1000;
  const newTokens = elapsed * refillRate;
  const currentBucket = Math.min(capacity, record.bucket + newTokens);
  return Math.max(0, Math.floor(currentBucket));
}
