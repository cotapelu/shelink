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
import { z } from 'zod';

export const emailSchema = z
  .string()
  .min(1, 'Email là bắt buộc')
  .email('Email không hợp lệ');

export const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(100, 'Mật khẩu không được quá 100 ký tự');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
  remember: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Xác nhận mật khẩu là bắt buộc'),
    full_name: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
  });

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').optional(),
  phone: z.string().optional(),
  avatar_url: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
});

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
});

export const idSchema = z.object({
  id: z.string().uuid('ID không hợp lệ'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
