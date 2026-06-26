import { ApiError, PaginationParams, PaginatedResponse } from './index';

export interface QueryParams extends PaginationParams {
  search?: string;
  filter?: Record<string, unknown>;
}

export interface FetchOptions extends RequestInit {
  params?: QueryParams;
}

export interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface RequestConfig {
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface MutationConfig<TVariables = unknown, TData = unknown> {
  onSuccess?: (data: TData) => void;
  onError?: (error: ApiError) => void;
  onSettled?: () => void;
}

export interface QueryConfig<TData = unknown> {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  retry?: number;
  staleTime?: number;
  onSuccess?: (data: TData) => void;
  onError?: (error: ApiError) => void;
}
