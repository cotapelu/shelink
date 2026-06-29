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
 * Enterprise API Client with full observability, resilience, and security
 *
 * IMPROVEMENTS (AGENTS.md v2.0 TIER 1):
 * - Modular architecture (request-builder, retry-handler, error-mapper, circuit-breaker)
 * - Correlation IDs for distributed tracing
 * - Circuit breaker on all external calls (production only)
 * - Retry with exponential backoff + jitter
 * - Timeout on all requests
 * - Structured error responses with codes
 * - Request/response logging in dev mode (JSON)
 * - Metrics recording (Prometheus format)
 * - No blocking I/O (uses native fetch)
 */

import { buildUrl, buildHeaders } from './request-builder';
import { getRetryDelay, shouldRetry, DEFAULT_MAX_RETRIES } from './retry-handler';
import { mapStatusCodeToErrorCode, ApiErrorCode } from './error-mapper';
import { CircuitBreaker, createCircuitBreaker, CircuitState } from './circuit-breaker';
import { generateCorrelationId } from '@/lib/telemetry/correlation-id';
import { recordApiRequest } from '@/lib/telemetry/metrics';
import { getCache, setCache, hasStaleCache, getStaleCache } from '@/lib/cache/fetch-cache';

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004/api';
}

// Configuration
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const CIRCUIT_BREAKER_ENABLED = process.env.NODE_ENV === 'production';

// Circuit breaker instances cache per endpoint
const breakerCache = new Map<string, CircuitBreaker<(...args: any[]) => Promise<any>>>();

function getOrCreateBreaker(endpoint: string, method: string): CircuitBreaker<(...args: any[]) => Promise<any>> {
  const key = `${method}:${endpoint}`;
  if (!breakerCache.has(key)) {
    const boundExecute = (token: string | null, options?: RequestOptions) =>
      executeRequest(token, endpoint, method, options);
    const breaker = createCircuitBreaker(boundExecute, {
      failureThreshold: 5,
      resetTimeout: 60000,
      halfOpenMaxCalls: 3,
      onStateChange: (state) => {
        console.info(`[CircuitBreaker] ${key} state: ${state}`);
      },
    });
    breakerCache.set(key, breaker);
  }
  return breakerCache.get(key)!;
}

async function executeRequest<T>(
  token: string | null,
  endpoint: string,
  method: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    params,
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_MAX_RETRIES,
    ...fetchOptions
  } = options;

  const requestId = generateCorrelationId();
  const url = buildUrl(endpoint, params);

  // Detect FormData to handle file uploads properly
  const rawBody = fetchOptions.body;
  const isFormData = rawBody instanceof FormData;

  // If body is not FormData and not a string, JSON.stringify it
  if (rawBody !== undefined && !isFormData && typeof rawBody !== 'string') {
    fetchOptions.body = JSON.stringify(rawBody);
  }
  // For FormData, fetchOptions.body stays as FormData; Content-Type will be set by browser

  const headers = buildHeaders(
    token,
    options.headers as Record<string, string> | undefined,
    requestId,
    isFormData
  );

  const useCache = method === 'GET' && options.useCache !== false;
  const cacheKey = useCache ? `${method}:${url}` : null;

  if (useCache && cacheKey) {
    const cached = getCache<T>(cacheKey);
    if (cached !== null) {
      if (process.env.NODE_ENV === 'development') {
        console.log({
          level: 'info',
          message: 'API request (cache hit)',
          correlationId: requestId,
          method,
          url,
        });
      }
      return { data: cached };
    }
  }

  let lastError: Error | null = null;
  let lastStatus: number | undefined;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = createTimeoutController(timeout);

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log({
          level: 'info',
          message: 'API Request',
          correlationId: requestId,
          method,
          url,
          attempt: attempt + 1,
        });
      }

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(controller.timeoutId!);
      const durationMs = Date.now() - startTime;

      // Parse JSON, but handle failures gracefully
      let jsonData: any;
      try {
        jsonData = await response.json();
      } catch (e) {
        jsonData = undefined;
      }

      if (!response.ok) {
        lastStatus = response.status;
        const errorCode = mapStatusCodeToErrorCode(response.status);
        const errorMessage =
          jsonData?.error || jsonData?.message || `Request failed with status ${response.status}`;
        const apiError: ApiResponse<T> = {
          error: errorMessage,
          code: errorCode,
          status: response.status,
        };

        recordApiRequest(endpoint, method, response.status, durationMs, true, errorCode);

        if (shouldRetry(attempt, retries, new Error(apiError.error), response.status)) {
          const delay = getRetryDelay(attempt);
          if (process.env.NODE_ENV === 'development') {
            console.warn({
              level: 'warn',
              message: 'Retrying request',
              correlationId: requestId,
              delay,
              attempt: attempt + 1,
              maxRetries: retries,
              status: response.status,
            });
          }
          await sleep(delay);
          continue;
        }

        console.error({
          level: 'error',
          message: 'API request failed',
          correlationId: requestId,
          method,
          url,
          status: response.status,
          error: apiError.error,
          code: apiError.code,
        });

        return apiError;
      }

      // Success
      recordApiRequest(endpoint, method, response.status, durationMs, false);

      if (useCache && cacheKey && jsonData !== undefined) {
        setCache(cacheKey, jsonData as T);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log({
          level: 'info',
          message: 'API request success',
          correlationId: requestId,
          method,
          url,
          status: response.status,
          durationMs,
          cached: false,
        });
      }

      // Unwrap payload: if envelope { data: ... } use that, else use whole response
      const payload =
        jsonData != null &&
        typeof jsonData === 'object' &&
        Object.prototype.hasOwnProperty.call(jsonData, 'data')
          ? jsonData.data
          : jsonData;

      return { data: payload };
    } catch (error) {
      clearTimeout(controller.timeoutId!);
      lastError = error as Error;

      const durationMs = Date.now() - startTime;

      if (shouldRetry(attempt, retries, error)) {
        const delay = getRetryDelay(attempt);
        if (process.env.NODE_ENV === 'development') {
          console.warn({
            level: 'warn',
            message: 'Retrying after network error',
            correlationId: requestId,
            delay,
            attempt: attempt + 1,
            maxRetries: retries,
            error: error instanceof Error ? error.message : 'Unknown network error',
          });
        }
        await sleep(delay);
        continue;
      }

      recordApiRequest(endpoint, method, 0, durationMs, true, 'network_error');

      console.error({
        level: 'error',
        message: 'API request failed after retries',
        correlationId: requestId,
        method,
        url,
        error: lastError.message,
      });

      if (useCache && cacheKey && hasStaleCache(cacheKey)) {
        const stale = getStaleCache<T>(cacheKey);
        if (stale !== null) {
          console.warn(`[Cache] Returning stale data for ${cacheKey} due to network error`);
          return { data: stale, error: `Stale cache: ${lastError.message}`, code: ApiErrorCode.NETWORK_ERROR };
        }
      }

      return {
        error: lastError.name === 'AbortError'
          ? 'Request timeout'
          : `Network error: ${lastError.message}`,
        code: lastError.name === 'AbortError' ? ApiErrorCode.TIMEOUT : ApiErrorCode.NETWORK_ERROR,
      };
    }
  }

  return {
    error: lastError?.message || 'Unknown error',
    code: ApiErrorCode.UNKNOWN,
  };
}

function createTimeoutController(timeout: number): AbortController & { timeoutId: ReturnType<typeof setTimeout> } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  return { ...controller, timeoutId };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
  retries?: number;
  useCache?: boolean;
  token?: string; // per-request token override
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: ApiErrorCode;
  status?: number;
}

export class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const method = options.method || 'GET';
    const token = options.token ?? this.token; // Prefer per-request token

    if (CIRCUIT_BREAKER_ENABLED) {
      const breaker = getOrCreateBreaker(endpoint, method);
      return await breaker.call(token, options);
    }

    return await executeRequest<T>(token, endpoint, method, options);
  }

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body,
    });
  }

  put<T>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body,
    });
  }

  patch<T>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body,
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  getBreakerState(endpoint: string, method: string = 'GET'): CircuitState | null {
    const key = `${method}:${endpoint}`;
    const breaker = breakerCache.get(key);
    return breaker ? breaker.getState() : null;
  }

  resetBreaker(endpoint?: string, method: string = 'GET'): void {
    if (endpoint) {
      const key = `${method}:${endpoint}`;
      const breaker = breakerCache.get(key);
      if (breaker) breaker.reset();
    } else {
      breakerCache.forEach(breaker => breaker.reset());
    }
  }
}

export const api = new ApiClient();
export default api;
