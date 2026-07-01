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

/**
 * Check if user has manager role (ADMIN or PRINCIPAL_LAWYER).
 * Managers have full access to all data across the firm.
 * @param role - User role string
 * @returns boolean
 */
export function isManager(role: string): boolean {
  return role === "ADMIN" || role === "PRINCIPAL_LAWYER";
}

// ============ QUYỀN TRUY CẬP VỤ ÁN ============

/**
 * Build Prisma where clause for matter list queries based on user role.
 * - Managers/Finance: return empty object (no restriction)
 * - Lawyers: see own matters + matters where they are members
 * - Assistants: see only matters where they are members
 *
 * @param userId - User ID
 * @param role - User role string
 * @returns Prisma.MatterWhereInput to be AND-ed into query
 */
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

/**
 * Assert that user can access a specific matter.
 * Throws "Vụ án không tồn tại" if not found or unauthorized (to avoid ID enumeration).
 * Managers and FINANCE role can access any non-deleted matter; others must be associated.
 *
 * @param userId - User ID
 * @param role - User role string
 * @param matterId - Matter ID to check
 */
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

/**
 * Assert user can associate (link) with a matter.
 * Only host or members can associate; managers/Principal Lawyers are NOT automatically allowed (must be explicit).
 *
 * @param userId - User ID
 * @param matterId - Matter ID
 * @throws {Error} If not associated
 */
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

/**
 * Assert user can handle (operate on) a matter.
 * Restricts to host or members; managers/finance must still be explicit members.
 *
 * @param userId - User ID
 * @param matterId - Matter ID
 * @throws {Error} If cannot handle
 */
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

/**
 * Assert user is a host (owner) or assistant (LEAD/CO_LEAD) of the matter.
 * Used for critical operations: archive, team management, document creation.
 *
 * @param userId - User ID
 * @param matterId - Matter ID
 * @param message? - Custom error message
 * @throws {Error} If not host/assistant
 */
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

/**
 * Assert user is the host (owner) of the matter.
 * Required for ownership-level operations: delete matter, change fee plan, etc.
 *
 * @param userId - User ID
 * @param matterId - Matter ID
 * @param message? - Custom error message
 * @throws {Error} If not the owner
 */
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

/**
 * Assert user can modify matter details (general write permission).
 * Uses matterAssociationFilter; managers/finance are NOT automatically allowed unless explicit member.
 *
 * @param userId - User ID
 * @param _role - User role (unused, kept for backward compatibility)
 * @param matterId - Matter ID
 * @throws {Error} If cannot modify
 */
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
