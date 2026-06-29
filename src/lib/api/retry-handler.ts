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
