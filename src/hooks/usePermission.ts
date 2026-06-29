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
'use client';

import { useAuth } from './useAuth';
import { hasPermission, type Permission } from '@/lib/constants';

export const usePermission = () => {
  const { user } = useAuth();

  const role = user?.role || 'guest';

  const checkPermission = (permission: Permission): boolean => {
    return hasPermission(role, permission);
  };

  const hasRole = (requiredRole: 'admin' | 'editor' | 'member' | 'guest'): boolean => {
    const roleHierarchy = { guest: 0, member: 1, editor: 2, admin: 3 };
    return roleHierarchy[role] >= roleHierarchy[requiredRole];
  };

  const isAdmin = role === 'admin';
  const isEditor = role === 'editor' || role === 'admin';
  const isMember = role === 'member' || role === 'editor' || role === 'admin';

  return {
    checkPermission,
    hasRole,
    isAdmin,
    isEditor,
    isMember,
    role,
  };
};
