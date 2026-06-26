import { BaseEntity, UserRole } from './index';

export interface User extends BaseEntity {
  email: string;
  role?: UserRole;
  is_active?: boolean;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

export interface UserProfile extends BaseEntity {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  role: UserRole;
  is_active: boolean;
}

export interface UserSession {
  user: User;
  expires_at: number;
  access_token: string;
  refresh_token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  confirmPassword?: string;
  full_name?: string;
}

export interface AuthState {
  user: User | null;
  session: UserSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
