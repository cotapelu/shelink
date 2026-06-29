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
 * Builds API request URLs with query parameters
 * Single responsibility: URL construction only
 */

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004/api';
}

export function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const API_URL = getApiUrl();
  // Ensure exactly one slash between base URL and endpoint
  const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${base}${normalizedEndpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) return;
      if (Array.isArray(value)) {
        value.forEach(v => {
          if (v !== undefined) searchParams.append(key, String(v));
        });
      } else {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  return url;
}

export function buildHeaders(
  token: string | null,
  extraHeaders?: Record<string, string>,
  requestId?: string,
  isFormData?: boolean
): HeadersInit {
  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };

  // Only set JSON content type if not sending FormData and not already provided
  if (!isFormData && !('Content-Type' in headers)) {
    headers['Content-Type'] = 'application/json';
  }

  if (requestId) {
    (headers as Record<string, string>)['X-Request-ID'] = requestId;
  }

  return headers;
}
