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
