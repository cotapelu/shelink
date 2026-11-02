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
/**
 * Helper phân quyền dùng chung cho bảo toàn tài sản (case/target/property).
 * Tách từ actions-v2.ts (AUTO-67c). Module thuần (không "use server") — import được từ nhiều action module.
 */
import { prisma } from "@/lib/prisma";
import { assertCanAssociateMatter } from "@/lib/permissions";

export type PreservationCaseAccess = {
  id: string;
  matterId: string | null;
  ownerId: string | null;
};

export async function assertCanAccessPreservationCaseRecord(
  userId: string,
  record: PreservationCaseAccess
) {
  if (record.matterId) {
    await assertCanAssociateMatter(userId, record.matterId);
    return;
  }
  if (record.ownerId !== userId) throw new Error("Không có quyền thao tác bản ghi bảo toàn này");
}

export async function assertCanAccessPreservationCase(userId: string, id: string) {
  const record = await prisma.preservationCase.findUnique({
    where: { id },
    select: { id: true, matterId: true, ownerId: true }
  });
  if (!record) throw new Error("Vụ án bảo toàn không tồn tại");
  await assertCanAccessPreservationCaseRecord(userId, record);
  return record;
}

export async function loadTargetWithCase(targetId: string) {
  const target = await prisma.preservationTarget.findUnique({
    where: { id: targetId },
    include: { case: { select: { id: true, matterId: true, ownerId: true } } }
  });
  if (!target) throw new Error("Bên bị bảo toàn không tồn tại");
  return target;
}

export async function loadPropertyWithCase(propertyId: string) {
  const property = await prisma.preservationProperty.findUnique({
    where: { id: propertyId },
    include: { target: { include: { case: { select: { id: true, matterId: true, ownerId: true } } } } }
  });
  if (!property) throw new Error("Tài sản bảo toàn không tồn tại");
  return property;
}

export function revalidatePreservationPaths(matterId: string | null) {
  // revalidatePath giữ ở action module (server-only); helper này chỉ dựng đường dẫn
  const paths = ["/preservation"];
  if (matterId) paths.push(`/matters/${matterId}`);
  return paths;
}
