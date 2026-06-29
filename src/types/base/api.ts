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
