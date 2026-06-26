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
