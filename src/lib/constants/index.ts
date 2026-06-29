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
import { UserRole } from '@/types/base';

export const ROLES: Record<UserRole, UserRole> = {
  admin: 'admin',
  editor: 'editor',
  member: 'member',
  guest: 'guest',
};

export const PERMISSIONS = {
  admin: [
    'view_dashboard',
    'create_data',
    'edit_data',
    'delete_data',
    'manage_users',
    'manage_settings',
    'export_data',
    'import_data',
  ],
  editor: [
    'view_dashboard',
    'create_data',
    'edit_data',
    'delete_data',
    'export_data',
  ],
  member: [
    'view_dashboard',
  ],
  guest: [],
} as const satisfies Record<UserRole, readonly string[]>;

export type Permission = 'view_dashboard' | 'create_data' | 'edit_data' | 'delete_data' | 'manage_users' | 'manage_settings' | 'export_data' | 'import_data';

export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  return PERMISSIONS[role]?.includes(permission as never) ?? false;
};

export const BREAKPOINTS = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 10,
  sortBy: 'created_at',
  sortDirection: 'desc' as const,
};

export const API_TIMEOUT = 30000;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;
