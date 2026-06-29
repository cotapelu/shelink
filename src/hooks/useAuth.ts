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

import api from '@/lib/api/client';
import API_ENDPOINTS from '@/lib/api/endpoints';
import {
  getToken,
  getUser,
  setToken,
  setRefreshToken,
  setUser,
  clearAuth,
} from '@/lib/storage/auth';
import type { User } from '@/types/base/user';
import { useState, useCallback, useEffect } from 'react';

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const useAuth = () => {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchSession = useCallback(async () => {
    let isMounted = true;
    const token = getToken();
    const userData = getUser();

    if (token && userData) {
      try {
        const response = await api.get<{ user: User }>(API_ENDPOINTS.AUTH.ME);
        if (isMounted) {
          if (response.data) {
            setUserState(response.data.user);
            setIsAuthenticated(true);
          } else {
            clearAuth();
            setUserState(null);
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        if (isMounted) {
          clearAuth();
          setUserState(null);
          setIsAuthenticated(false);
        }
      }
    } else if (isMounted) {
      setUserState(null);
      setIsAuthenticated(false);
    }
    if (isMounted) {
      setIsLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        fetchSession();
      }
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [fetchSession]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const response = await api.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      email,
      password,
    });

    if (response.error) {
      setIsLoading(false);
      throw new Error(response.error);
    }

    if (response.data) {
      setToken(response.data.accessToken);
      setRefreshToken(response.data.refreshToken);
      setUser(JSON.stringify(response.data.user));
      setUserState(response.data.user);
      setIsAuthenticated(true);
      setIsLoading(false);
      return response.data;
    }
    throw new Error('Login failed');
  };

  const register = async (email: string, password: string, fullName?: string) => {
    setIsLoading(true);
    const response = await api.post<LoginResponse>(API_ENDPOINTS.AUTH.REGISTER, {
      email,
      password,
      full_name: fullName,
    });

    if (response.error) {
      setIsLoading(false);
      throw new Error(response.error);
    }

    if (response.data) {
      setToken(response.data.accessToken);
      setRefreshToken(response.data.refreshToken);
      setUser(JSON.stringify(response.data.user));
      setUserState(response.data.user);
      setIsAuthenticated(true);
      setIsLoading(false);
      return response.data;
    }
    throw new Error('Registration failed');
  };

  const logout = async () => {
    await api.post(API_ENDPOINTS.AUTH.LOGOUT);
    clearAuth();
    setUserState(null);
    setIsAuthenticated(false);
  };

  const refreshSession = async () => {
    const refreshToken = getToken();
    if (!refreshToken) return false;

    const response = await api.post<LoginResponse>(API_ENDPOINTS.AUTH.REFRESH, {
      refresh_token: refreshToken,
    });

    if (response.data) {
      setToken(response.data.accessToken);
      setRefreshToken(response.data.refreshToken);
      setUser(JSON.stringify(response.data.user));
      setUserState(response.data.user);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshSession,
    fetchSession,
  };
};