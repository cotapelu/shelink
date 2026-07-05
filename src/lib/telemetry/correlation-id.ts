/*
 * Correlation ID utilities for distributed tracing
 * Generates and propagates X-Request-ID headers
 */

/**
 * Generate a unique correlation ID (UUID v4)
 */
export function generateCorrelationId(): string {
  return 'req_' + crypto.randomUUID();
}

/**
 * Get or create correlation ID from current context (headers, etc.)
 * For server-side: from headers
 * For client-side: from localStorage or generate new
 */
export function getCorrelationId(): string {
  if (typeof window !== 'undefined') {
    // Client-side: try to get from meta tag or localStorage
    let id = localStorage.getItem('x-request-id');
    if (!id) {
      id = generateCorrelationId();
      localStorage.setItem('x-request-id', id);
    }
    return id;
  } else {
    // Server-side: from headers (used in server actions/proxy)
    // This is a simplified version; actual implementation would read from request headers
    return generateCorrelationId();
  }
}

/**
 * Inject correlation ID into an object (e.g., logs, metrics)
 */
export function withCorrelationId<T extends object>(obj: T, id?: string): T & { correlationId: string } {
  const correlationId = id || getCorrelationId();
  return { ...obj, correlationId };
}
