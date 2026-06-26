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
