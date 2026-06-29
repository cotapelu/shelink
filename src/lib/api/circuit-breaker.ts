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
 * Circuit Breaker pattern implementation
 * Prevents cascading failures by failing fast when service is down
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation, requests pass through
  OPEN = 'OPEN',         // Failure threshold exceeded, fail fast
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;     // Number of failures before opening
  resetTimeout: number;         // Time in ms before trying half-open
  halfOpenMaxCalls: number;     // Max calls in half-open state
  onStateChange?: (state: CircuitState) => void;
}

export class CircuitBreaker<T extends (...args: any[]) => Promise<any>> {
  private fn: T;
  private config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private halfOpenCalls: number = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(fn: T, config: Partial<CircuitBreakerConfig> = {}) {
    this.fn = fn;
    this.config = {
      failureThreshold: config.failureThreshold ?? 1,
      resetTimeout: config.resetTimeout ?? 60000,
      halfOpenMaxCalls: config.halfOpenMaxCalls ?? 3,
      onStateChange: config.onStateChange,
    };
  }

  async call(...args: Parameters<T>): Promise<ReturnType<T>> {
    // Fast-fail if OPEN
    if (this.state === CircuitState.OPEN) {
      throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
    }

    // If HALF_OPEN, check max calls
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        throw new Error('Circuit breaker is HALF_OPEN and max calls exceeded.');
      }
      this.halfOpenCalls++;
    }

    try {
      const result = await this.fn(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  // Alias for compatibility
  async execute(...args: Parameters<T>): Promise<ReturnType<T>> {
    return this.call(...args);
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.CLOSED);
    }
    this.failureCount = 0;
    this.halfOpenCalls = 0;
  }

  private onFailure(): void {
    this.failureCount++;

    if (this.state === CircuitState.CLOSED && this.failureCount >= this.config.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return;

    // Clear any pending timer when leaving OPEN
    if (this.state === CircuitState.OPEN && this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.state = newState;

    // Reset half-open call counter when entering HALF_OPEN
    if (newState === CircuitState.HALF_OPEN) {
      this.halfOpenCalls = 0;
    }

    this.config.onStateChange?.(newState);

    // Log state change for observability
    if (typeof console !== 'undefined') {
      console.info(`[CircuitBreaker] State changed to: ${newState}`);
    }

    // When transitioning to OPEN, schedule transition to HALF_OPEN after resetTimeout
    if (newState === CircuitState.OPEN) {
      this.timer = setTimeout(() => {
        this.transitionTo(CircuitState.HALF_OPEN);
      }, this.config.resetTimeout);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  reset(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
    this.halfOpenCalls = 0;
  }
}

/**
 * Wrap an API function with circuit breaker
 */
export function createCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker<T> {
  return new CircuitBreaker(fn, config);
}
