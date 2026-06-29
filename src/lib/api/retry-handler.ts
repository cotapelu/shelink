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
 * Retry logic with exponential backoff + jitter
 * Single responsibility: calculate delays and retry decisions
 */

export const DEFAULT_MAX_RETRIES = 2;
export const RETRY_DELAY_BASE = 300; // ms
export const RETRY_DELAY_MAX = 2000; // ms

/**
 * Calculate retry delay with exponential backoff + jitter
 */
export function getRetryDelay(attempt: number): number {
  const delay = Math.min(RETRY_DELAY_BASE * Math.pow(2, attempt), RETRY_DELAY_MAX);
  // Add jitter (±20%) to prevent thundering herd
  const jitter = delay * 0.2 * Math.random();
  return Math.floor(delay + (Math.random() > 0.5 ? jitter : -jitter));
}

/**
 * Determine if error is retryable
 */
export function isRetryableError(error: unknown, status?: number): boolean {
  // Network errors (no status) are retryable
  if (status === undefined) return true;

  // 5xx server errors are retryable
  if (status >= 500 && status < 600) return true;

  // 429 Too Many Requests - retry after reading Retry-After header
  if (status === 429) return true;

  // 408 Request Timeout - retryable
  if (status === 408) return true;

  return false;
}

/**
 * Should we retry based on attempt count and error?
 */
export function shouldRetry(attempt: number, maxRetries: number, error: unknown, status?: number): boolean {
  if (attempt >= maxRetries) return false;
  return isRetryableError(error, status);
}
