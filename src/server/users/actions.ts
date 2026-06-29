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
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";

const userRoleSchema = z.enum([
  "ADMIN",
  "PRINCIPAL_LAWYER",
  "LAWYER",
  "ASSISTANT",
  "FINANCE"
]);

const userCreateSchema = z.object({
  name: z.string().min(1, "Họ tên bắt buộc").max(40),
  email: z.string().email("Địa chỉ email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu ít nhất 8 ký tự").max(128),
  role: userRoleSchema,
  phone: z.string().max(30).optional().or(z.literal(""))
});

const userUpdateRoleSchema = z.object({
  id: z.string().cuid(),
  role: userRoleSchema
});

const resetPasswordSchema = z.object({
  id: z.string().cuid(),
  newPassword: z.string().min(8).max(128)
});

const changeMyPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128)
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateRoleInput = z.infer<typeof userUpdateRoleSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangeMyPasswordInput = z.infer<typeof changeMyPasswordSchema>;

async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("Chỉ admin được thực hiện");
  }
  return session;
}

export async function listUsers() {
  await requireAdmin();
  return prisma.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { ownedMatters: true, memberships: true } }
    }
  });
}

/**
 * Bất kỳ user đã đăng nhập nào cũng gọi được: Lấy danh sách đồng nghiệp đang hoạt động, dùng để chọn khi nhận vụ án/tạo team.
 * Mặc định loại trừ vai trò hệ thống FINANCE/ADMIN (vẫn có thể chọn, khi chuyển sang chế độ "Tất cả").
 */
export async function listActiveColleagues() {
  await requireSession();
  return prisma.user.findMany({
    where: { active: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true }
  });
}

export async function createUser(input: UserCreateInput) {
  const session = await requireAdmin();
  const data = userCreateSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Email đã được sử dụng");

  const passwordHash = await bcrypt.hash(data.password, 12);
  const created = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      phone: data.phone || null,
      active: true
    }
  });

  await audit({
    userId: session.user.id,
    action: "USER_CREATE",
    targetType: "User",
    targetId: created.id,
    detail: { email: created.email, role: created.role }
  });

  revalidatePath("/settings/users");
  return { ok: true, id: created.id };
}

export async function updateUserRole(input: UserUpdateRoleInput) {
  const session = await requireAdmin();
  const data = userUpdateRoleSchema.parse(input);
  if (data.id === session.user.id) {
    throw new Error("Không thể sửa vai trò của chính mình");
  }

  await prisma.user.update({
    where: { id: data.id },
    data: { role: data.role }
  });

  await audit({
    userId: session.user.id,
    action: "USER_ROLE_UPDATE",
    targetType: "User",
    targetId: data.id,
    detail: { role: data.role }
  });

  revalidatePath("/settings/users");
  return { ok: true };
}

export async function toggleUserActive(id: string) {
  const session = await requireAdmin();
  if (id === session.user.id) {
    throw new Error("Không thể vô hiệu hóa chính mình");
  }
  const current = await prisma.user.findUnique({ where: { id }, select: { active: true } });
  if (!current) throw new Error("User không tồn tại");

  await prisma.user.update({
    where: { id },
    data: { active: !current.active }
  });

  await audit({
    userId: session.user.id,
    action: current.active ? "USER_DEACTIVATE" : "USER_ACTIVATE",
    targetType: "User",
    targetId: id
  });

  revalidatePath("/settings/users");
  return { ok: true, active: !current.active };
}

export async function resetUserPassword(input: ResetPasswordInput) {
  const session = await requireAdmin();
  const data = resetPasswordSchema.parse(input);

  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({
    where: { id: data.id },
    data: { passwordHash }
  });

  await audit({
    userId: session.user.id,
    action: "USER_PASSWORD_RESET",
    targetType: "User",
    targetId: data.id
  });

  return { ok: true };
}

/**
 * 当前用户改自己的密码（任何角色可用）。
 */
export async function changeMyPassword(input: ChangeMyPasswordInput) {
  const session = await requireSession();
  const data = changeMyPasswordSchema.parse(input);

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true }
  });
  if (!me) throw new Error("User không tồn tại");

  const matches = await bcrypt.compare(data.currentPassword, me.passwordHash);
  if (!matches) throw new Error("Mật khẩu hiện tại không đúng");

  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash }
  });

  await audit({
    userId: session.user.id,
    action: "USER_PASSWORD_CHANGE_SELF",
    targetType: "User",
    targetId: session.user.id
  });

  return { ok: true };
}

/** v0.43: Lưu / xóa avatar cá nhân (base64 data URL lưu trực tiếp trong User.avatar, giới hạn ~256KB) */
const AVATAR_MAX_CHARS = 256 * 1024;
export async function saveMyAvatar(input: { avatar: string | null }) {
  const session = await requireSession();
  let avatar = input.avatar;
  if (typeof avatar === "string" && avatar.length > 0) {
    if (!/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/.test(avatar)) {
      throw new Error("Avatar phải là ảnh PNG / JPG / WebP / SVG");
    }
    if (avatar.length > AVATAR_MAX_CHARS) {
      throw new Error("Avatar quá lớn, vui lòng giới hạn khoảng 180KB");
    }
  } else {
    avatar = null;
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatar }
  });

  await audit({
    userId: session.user.id,
    action: "USER_AVATAR_UPDATE",
    targetType: "User",
    targetId: session.user.id
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
