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
export type UserRole = 'admin' | 'editor' | 'member' | 'guest';

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface SoftDeleteEntity extends BaseEntity {
  deleted_at?: string | null;
}

export interface ActiveEntity extends BaseEntity {
  is_active: boolean;
}

export type SortDirection = 'asc' | 'desc';

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortDirection?: SortDirection;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, string[]>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}
