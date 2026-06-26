/**
 * Correlation ID management for distributed tracing
 * Generates unique IDs and stores them in async local storage for propagation
 */

// Simple correlation ID generator
export function generateCorrelationId(): string {
  // Use crypto.randomUUID() if available, otherwise timestamp-based
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// AsyncLocalStorage for storing correlation ID throughout async call chain
// Note: Next.js server actions run in isolated contexts, but this helps in API routes
let asyncLocalStorage: { getStore: () => Map<string, string>; run: <T>(store: Map<string, string>, fn: () => T) => T } | null = null;

try {
  // Dynamic import to avoid SSR issues
  if (typeof window === 'undefined') {
    // Server-side: use AsyncLocalStorage if available (Node.js 16+)
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const { AsyncLocalStorage } = require('async_hooks');
    asyncLocalStorage = new (AsyncLocalStorage as any)();
  }
} catch (e) {
  console.warn('[CorrelationId] AsyncLocalStorage not available:', e);
}

/**
 * Get current correlation ID from async context or generate new
 */
export function getCorrelationId(): string {
  // Try to get from async local storage
  if (asyncLocalStorage) {
    const store = asyncLocalStorage.getStore();
    if (store) {
      const existing = store.get('correlation-id');
      if (existing) return existing;
    }
  }

  // Fallback: generate new
  return generateCorrelationId();
}

/**
 * Create a context with correlation ID for async operations
 */
export function withCorrelationId<T>(fn: () => T): T {
  const correlationId = generateCorrelationId();
  const store = new Map<string, string>([['correlation-id', correlationId]]);

  if (asyncLocalStorage) {
    return asyncLocalStorage.run(store, fn);
  }

  // Fallback: just run the function (no propagation)
  return fn();
}

/**
 * Extract correlation ID from headers (for logging)
 */
export function extractCorrelationIdFromHeaders(headers: Headers): string | null {
  const header = headers.get('X-Request-ID');
  return header || null;
}
