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
