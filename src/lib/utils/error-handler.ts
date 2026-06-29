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
 * Centralized error handling utility for server actions
 * Ensures consistent error responses and logging
 * Format: [ERROR] Component Action - Reason - Suggestion
 */

import { ApiErrorCode } from '@/lib/api/error-mapper';

export interface AppError {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Get user-friendly suggestion based on error code
 */
function getSuggestion(code: string, action?: string): string {
  switch (code) {
    case 'unauthorized':
      return 'Vui lòng đăng nhập lại.';
    case 'forbidden':
      return 'Bạn không có quyền thực hiện hành động này. Liên hệ admin nếu cần.';
    case 'not_found':
      return 'Tài nguyên không tồn tại. Kiểm tra lại thông tin.';
    case 'validation_failed':
      return 'Vui lòng kiểm tra lại dữ liệu nhập. Các trường bắt buộc phải đúng định dạng.';
    case 'has_relationships':
      return 'Xóa các mối quan hệ liên quan trước khi thực hiện.';
    case 'api_error':
      return 'Máy chủ gặp lỗi. Đội ngũ kỹ thuật đã được thông báo. Vui lòng thử lại sau.';
    case 'network_error':
      return 'Không thể kết nối đến máy chủ. Kiểm tra kết nối mạng và thử lại.';
    case 'timeout':
      return 'Yêu cầu quá thời gian. Vui lòng Thử lại.';
    case 'rate_limited':
      return 'Quá nhiều yêu cầu. Hãy chờ một chút và thử lại sau.';
    case 'conflict':
      return 'Dữ liệu bị xung đột. Vui lòng thử lại.';
    default:
      return 'Vui lòng thử lại sau. Nếu lỗi tiếp tục, liên hệ hỗ trợ.';
  }
}

/**
 * Format API error into user-friendly message with required structure
 * [ERROR] Component Action - Reason - Suggestion
 */
export function formatApiError(
  apiError: { error?: string; code?: ApiErrorCode; status?: number },
  actionName: string,
  defaultMessage: string = 'Đã xảy ra lỗi.'
): AppError {
  const code = apiError.code ? apiError.code.toString().toLowerCase() : 'unknown';
  const reason = apiError.error || defaultMessage;
  const suggestion = getSuggestion(code, actionName);

  // Format: [ERROR] ActionName - reason - suggestion
  const userMessage = `[ERROR] ${actionName} - ${reason} - ${suggestion}`;

  return {
    error: userMessage,
    code,
    details: process.env.NODE_ENV === 'development' ? { error: apiError.error, status: apiError.status } : undefined,
  };
}

/**
 * Log action execution with context (structured)
 */
export function logAction(
  action: string,
  params: Record<string, unknown>,
  userId?: string,
  result?: { success: boolean; error?: string }
): void {
  const logEntry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level: result?.success ? 'info' : 'error',
    action,
    params: sanitizeParams(params),
    result: result ? { success: result.success, ...(result.error ? { error: result.error } : {}) } : null,
  };

  if (userId) logEntry.userId = userId;

  // In production, use proper structured logger (pino/winston)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Action]', logEntry);
  } else {
    // In production, ensure JSON logging
    console.log(JSON.stringify(logEntry));
  }
}

/**
 * Sanitize parameters for logging (remove secrets)
 */
function sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...params };
  const secretKeys = ['password', 'token', 'secret', 'key', 'authorization', 'refreshToken'];

  secretKeys.forEach(key => {
    if (sanitized[key] !== undefined) {
      sanitized[key] = '***REDACTED***';
    }
  });

  return sanitized;
}

/**
 * Wrapper for server actions with consistent error handling and logging
 */
export async function withErrorHandling<T>(
  actionName: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T | AppError> {
  try {
    const result = await fn();
    logAction(actionName, context || {}, undefined, { success: true });
    return result;
  } catch (error) {
    const apiError = error as { error?: string; code?: ApiErrorCode; status?: number };
    const formatted = formatApiError(apiError, actionName);
    logAction(actionName, context || {}, undefined, { success: false, error: formatted.error });
    return formatted as AppError;
  }
}
