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
