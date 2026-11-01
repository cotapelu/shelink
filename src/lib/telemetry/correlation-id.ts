/*
 * Correlation ID utilities for distributed tracing
 * Generates and propagates X-Request-ID headers
 */

/** Khóa lưu correlation id ở localStorage (client-side) */
const CORRELATION_STORAGE_KEY = 'x-request-id';

/**
 * Generate a unique correlation ID (UUID v4)
 */
export function generateCorrelationId(): string {
  return 'req_' + crypto.randomUUID();
}

/**
 * Đọc correlation id từ localStorage.
 * Trả null nếu storage không khả dụng (SSR/jsdom chưa bật storage/private mode).
 */
function readStoredCorrelationId(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(CORRELATION_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Ghi correlation id xuống localStorage; storage lỗi thì bỏ qua (id vẫn dùng được). */
function writeStoredCorrelationId(id: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CORRELATION_STORAGE_KEY, id);
  } catch {
    // Storage không khả dụng (private mode / quota) — bỏ qua
  }
}

/**
 * Get or create correlation ID from current context (headers, etc.)
 * For server-side: from headers
 * For client-side: from localStorage or generate new
 */
export function getCorrelationId(): string {
  if (typeof window === 'undefined') {
    // Server-side: from headers (used in server actions/proxy)
    // This is a simplified version; actual implementation would read from request headers
    return generateCorrelationId();
  }

  // Client-side: try to get from localStorage, else generate and persist
  const stored = readStoredCorrelationId();
  if (stored) return stored;

  const id = generateCorrelationId();
  writeStoredCorrelationId(id);
  return id;
}

/**
 * Inject correlation ID into an object (e.g., logs, metrics)
 */
export function withCorrelationId<T extends object>(obj: T, id?: string): T & { correlationId: string } {
  const correlationId = id || getCorrelationId();
  return { ...obj, correlationId };
}
