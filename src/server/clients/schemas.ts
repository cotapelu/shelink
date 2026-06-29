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
import { z } from "zod";

export const clientTypeSchema = z.enum(["INDIVIDUAL", "COMPANY", "ORGANIZATION"]);
export const cooperationStatusSchema = z.enum([
  "POTENTIAL",
  "NEGOTIATING",
  "SIGNED",
  "TERMINATED"
]);
export const clientGenderSchema = z.enum(["MALE", "FEMALE"]);

export const contactInputSchema = z.object({
  name: z.string().min(1, "Họ tên liên hệ bắt buộc").max(40),
  title: z.string().max(40).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  wechat: z.string().max(40).optional().or(z.literal("")),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(500).optional().or(z.literal(""))
});

export const clientCreateSchema = z.object({
  name: z.string().min(1, "Tên khách hàng bắt buộc").max(120),
  type: clientTypeSchema,
  idNumber: z.string().max(50).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  legalRep: z.string().max(40).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  source: z.string().max(80).optional().or(z.literal("")),
  // v0.39: Bổ sung trường case cloud (internalCode hệ thống sinh, không nhập từ user)
  cooperationStatus: cooperationStatusSchema.default("SIGNED"),
  industry: z.string().max(60).optional().or(z.literal("")),
  gender: clientGenderSchema.optional().or(z.literal("")),
  ethnicity: z.string().max(30).optional().or(z.literal("")),
  tags: z.array(z.string().max(20)).default([]),
  notes: z.string().max(1000).optional().or(z.literal("")),
  contacts: z.array(contactInputSchema).default([])
});

export const clientUpdateSchema = clientCreateSchema.extend({
  id: z.string().cuid()
});

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
export type ContactInput = z.infer<typeof contactInputSchema>;

export const clientListQuerySchema = z.object({
  search: z.string().optional(),
  type: clientTypeSchema.optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type ClientListQuery = z.infer<typeof clientListQuerySchema>;
