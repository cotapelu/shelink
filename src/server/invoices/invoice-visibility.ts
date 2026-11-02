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
 * Phân quyền + hằng dùng chung cho luồng hóa đơn — tách từ invoices/actions.ts (AUTO-67e).
 */
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { isManager, matterVisibilityFilter } from "@/lib/permissions";

export const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function requireFinanceOrApprover(role: string) {
  if (role !== "FINANCE" && role !== "ADMIN" && role !== "PRINCIPAL_LAWYER") {
    throw new Error("Chỉ Tài chính / quản trị / luật sư chủ trì mới được xử lý hóa đơn");
  }
}

export function canReviewInvoiceRequests(role: string) {
  return isManager(role) || role === "FINANCE";
}

export function invoiceRequestVisibilityWhere(
  userId: string,
  role: string
): Prisma.InvoiceRequestWhereInput {
  if (canReviewInvoiceRequests(role)) return {};
  return {
    OR: [
      { requestedById: userId },
      {
        matter: {
          deletedAt: null,
          ...matterVisibilityFilter(userId, role)
        }
      }
    ]
  };
}

/** Audit + revalidate dùng chung cho các luồng hóa đơn */
export function finishInvoiceFlow(matterId: string | null) {
  if (matterId) revalidatePath(`/matters/${matterId}`);
  revalidatePath("/finance");
}
