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
