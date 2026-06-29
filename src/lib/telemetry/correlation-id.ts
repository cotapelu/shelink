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
