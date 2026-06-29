/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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