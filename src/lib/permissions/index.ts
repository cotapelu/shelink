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
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** ADMIN 或 PRINCIPAL_LAWYER — 管理层，看所有数据 */
export function isManager(role: string): boolean {
  return role === "ADMIN" || role === "PRINCIPAL_LAWYER";
}

// ============ QUYỀN TRUY CẬP VỤ ÁN ============

/** Dùng cho list query: trả về Prisma where片段, AND vào where hiện tại */
export function matterVisibilityFilter(
  userId: string,
  role: string
): Prisma.MatterWhereInput {
  if (isManager(role) || role === "FINANCE") return {};
  if (role === "LAWYER") {
    return {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } }
      ]
    };
  }
  // ASSISTANT
  return { members: { some: { userId } } };
}

/** Dùng cho operations/association: không mở rộng scope toàn firm do vai trò ADMIN/PRINCIPAL_LAWYER/FINANCE */
export function matterAssociationFilter(userId: string): Prisma.MatterWhereInput {
  return {
    OR: [
      { ownerId: userId },
      { members: { some: { userId } } }
    ]
  };
}

/** Assertion single access: nếu không thấy hoặc không có quyền, luôn throw "Vụ án không tồn tại" (tránh leak ID) */
export async function assertCanAccessMatter(
  userId: string,
  role: string,
  matterId: string
): Promise<void> {
  if (isManager(role) || role === "FINANCE") {
    const exists = await prisma.matter.findFirst({
      where: { id: matterId, deletedAt: null },
      select: { id: true }
    });
    if (!exists) throw new Error("Vụ án không tồn tại");
    return;
  }
  const row = await prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      ...matterVisibilityFilter(userId, role)
    },
    select: { id: true }
  });
  if (!row) throw new Error("Vụ án không tồn tại");
}

/** Assertion cho operations/association: chỉ cho phép host hoặc member, không open do vai trò quản lý */
export async function assertCanAssociateMatter(
  userId: string,
  matterId: string
): Promise<void> {
  const row = await prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      ...matterAssociationFilter(userId)
    },
    select: { id: true }
  });
  if (!row) throw new Error("Vụ án không tồn tại hoặc không có quyền liên kết");
}

/** Assertion cho matter handling: chỉ cho phép host hoặc member, không open do vai trò quản lý */
export async function assertCanHandleMatter(
  userId: string,
  matterId: string
): Promise<void> {
  const row = await prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      ...matterAssociationFilter(userId)
    },
    select: { id: true }
  });
  if (!row) throw new Error("Vụ án không tồn tại hoặc không có quyền xử lý");
}

/** Host/Assistant assertion: dùng cho lưu trữ, team, thông tin chính, tạo văn bản... */
export async function assertCanLeadMatter(
  userId: string,
  matterId: string,
  message = "Chỉ host/assistant của vụ án có thể thao tác"
): Promise<void> {
  const row = await prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      OR: [
        { ownerId: userId },
        { members: { some: { userId, role: { in: ["LEAD", "CO_LEAD"] } } } }
      ]
    },
    select: { id: true }
  });
  if (!row) throw new Error(message);
}

/** Assertion cho current host lawyer: dùng cho thay đổi team, xóa vụ án, các operation level ownership */
export async function assertCanOwnMatter(
  userId: string,
  matterId: string,
  message = "Chỉ host lawyer của vụ án có thể thao tác"
): Promise<void> {
  const row = await prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      ownerId: userId
    },
    select: { id: true }
  });
  if (!row) throw new Error(message);
}

/** Assertion modification: chỉ cho phép host hoặc member, không open do vai trò quản lý */
export async function assertCanModifyMatter(
  userId: string,
  _role: string,
  matterId: string
): Promise<void> {
  const matter = await prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      ...matterAssociationFilter(userId)
    },
    select: { id: true }
  });
  if (!matter) throw new Error("Vụ án không tồn tại");
}

// ============ INTÁKE VISIBILITY ============

export function intakeVisibilityFilter(
  userId: string,
  role: string
): Prisma.IntakeWhereInput {
  if (isManager(role)) return {};
  return {
    OR: [
      { createdById: userId },
      { ownerUserId: userId },
      { coUserIds: { has: userId } }
    ]
  };
}

// ============ CLIENT VISIBILITY ============

/** Client visibility determined by associated matters; manager/finance see all */
export function clientVisibilityFilter(
  userId: string,
  role: string
): Prisma.ClientWhereInput {
  if (isManager(role) || role === "FINANCE") return {};
  return {
    OR: [
      { matters: { some: { deletedAt: null, ...matterVisibilityFilter(userId, role) } } },
      { intakes: { some: intakeVisibilityFilter(userId, role) } }
    ]
  };
}

// ============ COMMON ASSERTIONS ============

export function assertManagerOrRole(role: string, ...allowed: string[]): void {
  if (isManager(role)) return;
  if (allowed.includes(role)) return;
  throw new Error("Không đủ quyền");
}
