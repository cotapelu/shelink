/*
 * Server action lưu cấu hình thuật ngữ (TD-G1, DATA-MODEL §4.32).
 * Chỉ quản lý (ADMIN/PRINCIPAL_LAWYER) được chỉnh.
 */

"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { isManager } from "@/lib/permissions";
import { audit } from "@/server/audit";
import { saveTerms } from "./terminology";
import type { TerminologyMap } from "@/lib/terminology";

export async function saveTerminologyAction(terms: TerminologyMap): Promise<{ ok: true }> {
  const session = await requireSession();
  if (!isManager(session.user.role)) {
    throw new Error("Chỉ quản lý (ADMIN/PRINCIPAL_LAWYER) được chỉnh thuật ngữ");
  }
  const resolved = await saveTerms(terms);
  await audit({
    userId: session.user.id,
    action: "UPDATE",
    targetType: "SystemSetting",
    targetId: "terminology",
    detail: { terms: resolved }
  });
  // Thuật ngữ ảnh hưởng nhãn nhiều trang → revalidate toàn bộ layout.
  revalidatePath("/", "layout");
  return { ok: true };
}
