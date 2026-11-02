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
 * v0.9.4 Sinh mã lưu trữ
 *
 * Định dạng: YYYY-loại-NNNN
 *   - YYYY = năm lưu trữ (theo archivedAt)
 *   - loại = viết tắt của MatterCategory (1 ký tự)
 *   - NNNN = số thứ tự lưu trữ cùng loại trong năm (đệm 0, 4 chữ số, từ 0001)
 *
 * Ví dụ: 2026-民-0017
 *
 * Đồng thời: dựa vào @@unique(archiveNo). Khi trùng thì quay lại lấy max rồi +1 (thử lại tối đa 3 lần).
 * LƯU Ý (quyết định giữ nguyên): giá trị CATEGORY_SHORT vẫn là ký tự gốc để tương thích mã đã lưu trong DB.
 */
import type { MatterCategory } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

const CATEGORY_SHORT: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "民",
  LABOR_ARBITRATION: "劳",
  COMMERCIAL_ARBITRATION: "商",
  CRIMINAL: "刑",
  ADMINISTRATIVE: "行",
  NON_LITIGATION: "非",
  LEGAL_COUNSEL: "顾",
  SPECIAL_PROJECT: "专"
};

export function categoryShort(category: MatterCategory): string {
  return CATEGORY_SHORT[category] ?? "案";
}

export async function nextArchiveNo(
  tx: Pick<PrismaClient, "archiveRecord">,
  category: MatterCategory,
  archivedAt: Date = new Date()
): Promise<string> {
  const year = archivedAt.getFullYear();
  const short = categoryShort(category);
  const prefix = `${year}-${short}-`;

  // Lấy archiveNo lớn nhất cùng tiền tố trong năm
  const existing = await tx.archiveRecord.findMany({
    where: { archiveNo: { startsWith: prefix } },
    select: { archiveNo: true },
    orderBy: { archiveNo: "desc" },
    take: 1
  });

  let next = 1;
  if (existing.length > 0) {
    const m = existing[0].archiveNo.match(/-(\d{4})$/);
    if (m) next = parseInt(m[1], 10) + 1;
  }

  return `${prefix}${String(next).padStart(4, "0")}`;
}
