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
import { ApiError, PaginationParams } from './index';

/**
 * Query parameters for API calls, extending pagination.
 */
export interface QueryParams extends PaginationParams {
  search?: string;
  filter?: Record<string, unknown>;
}

/**
 * Options for fetch requests, includes standard RequestInit plus query params.
 */
export interface FetchOptions extends RequestInit {
  params?: QueryParams;
}

/**
 * Describes an API endpoint (path + method).
 */
export interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

/**
 * HTTP method names (lowercase).
 */
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

/**
 * Configuration for making a request (method, headers, body).
 */
export interface RequestConfig {
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
}

/**
 * Configuration for mutation operations (callbacks for success/error/settled).
 * @template TData - Return data type
 */
export interface MutationConfig<TData = unknown> {
  onSuccess?: (data: TData) => void;
  onError?: (error: ApiError) => void;
  onSettled?: () => void;
}

/**
 * Configuration for query operations.
 * @template TData - Data type returned by the query
 */
export interface QueryConfig<TData = unknown> {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  retry?: number;
  staleTime?: number;
  onSuccess?: (data: TData) => void;
  onError?: (error: ApiError) => void;
}
