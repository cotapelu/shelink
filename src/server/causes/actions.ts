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

import type { MatterCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

const CAUSE_SELECT = {
  id: true,
  code: true,
  name: true,
  shortName: true,
  level: true,
  parentId: true,
  parent: {
    select: {
      id: true,
      name: true,
      level: true,
      parent: { select: { id: true, name: true, level: true } }
    }
  }
} as const;

export type CauseSearchResult = {
  id: string;
  code: string | null;
  name: string;
  shortName: string | null;
  level: number;
  parentId: string | null;
  /** Tên phân loại cấp 2 (dùng cho UI hiển thị đường dẫn "X / Y") */
  l2Name: string | null;
  /** Tên phân loại cấp 1 */
  l1Name: string | null;
};

function flatten(c: {
  id: string;
  code: string | null;
  name: string;
  shortName: string | null;
  level: number;
  parentId: string | null;
  parent: {
    id: string;
    name: string;
    level: number;
    parent: { id: string; name: string; level: number } | null;
  } | null;
}): CauseSearchResult {
  // Tìm l1 / l2: lay theo level tu chinh node nay + cac to tien phia tren
  const chain: { name: string; level: number }[] = [{ name: c.name, level: c.level }];
  if (c.parent) chain.push({ name: c.parent.name, level: c.parent.level });
  if (c.parent?.parent) chain.push({ name: c.parent.parent.name, level: c.parent.parent.level });
  const l1 = chain.find((x) => x.level === 1)?.name ?? null;
  const l2 = chain.find((x) => x.level === 2)?.name ?? null;
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    shortName: c.shortName,
    level: c.level,
    parentId: c.parentId,
    l1Name: l1,
    l2Name: l2
  };
}

/**
 * Tra kho nguyên nhân chuẩn hoá.
 *
 * - Bắt buộc truyền category
 * - Khi query rỗng: trả về nguyên nhân cấp 2 của category (cho người dùng xem phân loại trước) + một phần cấp 3
 * - Khớp mờ trên name / shortName / keywords / pinyin
 * - Kết quả kèm chuỗi parent, UI có thể hiển thị đường dẫn "cấp 2 / cấp 3"
 */
// v0.34: vụ án trọng tài dùng chung kho nguyên nhân dân sự-thương mại, nhưng giới hạn phạm vi có thể trọng tài theo Điều 3 Luật Trọng tài
// Trọng tài lao động → chỉ tranh chấp lao động (CC-7); trọng tài thương mại → hợp đồng + quyền lợi tài sản (CC-3/4/5/6/8/9, loại trừ nhân phẩm/hôn nhân thừa kế/lao động/nguyên hại/phi tố tụng/thủ tục đặc biệt)
function causeScope(category: MatterCategory): {
  dbCategory: MatterCategory;
  codePrefixes: string[] | null;
} {
  if (category === "LABOR_ARBITRATION")
    return { dbCategory: "CIVIL_COMMERCIAL", codePrefixes: ["CC-7"] };
  if (category === "COMMERCIAL_ARBITRATION")
    return {
      dbCategory: "CIVIL_COMMERCIAL",
      codePrefixes: ["CC-3", "CC-4", "CC-5", "CC-6", "CC-8", "CC-9"]
    };
  return { dbCategory: category, codePrefixes: null };
}

function codeFilter(prefixes: string[]) {
  // Code cấp 1 dạng CC-7, con dạng CC-7-...; phân biệt bằng tiền tố (CC-1 không khớp nhầm CC-10)
  return {
    OR: prefixes.flatMap((p) => [
      { code: p },
      { code: { startsWith: `${p}-` } }
    ])
  };
}

export async function searchCauses(params: {
  category: MatterCategory;
  query?: string;
  limit?: number;
}): Promise<CauseSearchResult[]> {
  await requireSession();
  // v0.16: nâng cap lên 2000 để UI cấp dẫn kéo toàn bộ một lần (dân sự 1055 / hình sự 511)
  const limit = Math.min(params.limit ?? 50, 2000);
  const q = params.query?.trim();
  const { dbCategory, codePrefixes } = causeScope(params.category);

  if (!q) {
    // Query rỗng: trả về toàn bộ 4 cấp của category (UI cấp dẫn cần level=1)
    const list = await prisma.causeOfAction.findMany({
      where: {
        category: dbCategory,
        active: true,
        ...(codePrefixes ? codeFilter(codePrefixes) : {})
      },
      orderBy: [{ level: "asc" }, { code: "asc" }],
      take: limit,
      select: CAUSE_SELECT
    });
    return list.map(flatten);
  }

  const list = await prisma.causeOfAction.findMany({
    where: {
      category: dbCategory,
      active: true,
      level: { gte: 2 }, // Từ cấp 2 trở lên mới chọn được
      AND: [
        ...(codePrefixes ? [codeFilter(codePrefixes)] : []),
        {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { shortName: { contains: q, mode: "insensitive" } },
            { keywords: { has: q } },
            { pinyin: { contains: q, mode: "insensitive" } }
          ]
        }
      ]
    },
    orderBy: [{ level: "asc" }, { code: "asc" }],
    take: limit,
    select: CAUSE_SELECT
  });
  return list.map(flatten);
}

export async function getCauseById(id: string) {
  await requireSession();
  const c = await prisma.causeOfAction.findUnique({
    where: { id },
    select: { ...CAUSE_SELECT, category: true }
  });
  if (!c) return null;
  return { ...flatten(c), category: c.category };
}

/**
 * v0.13: liệt kê toàn bộ phân loại cấp 2 của một category (dùng cho bước đầu của UI cấp dẫn)
 */
export async function listCauseL2(category: MatterCategory) {
  await requireSession();
  return prisma.causeOfAction.findMany({
    where: { category, active: true, level: 2 },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, parentId: true }
  });
}
