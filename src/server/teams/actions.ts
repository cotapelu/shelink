"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { buildOrgChart, type OrgChart } from "./org-chart";

/** Chặn trần đọc: tránh kéo toàn bộ bảng khi công ty lớn. */
const MAX_TEAMS = 200;

/**
 * Cơ cấu nội bộ (TD-D4): team + thành viên, CHỈ ĐỌC.
 * Mọi vai trò đăng nhập đều xem được — cơ cấu nội bộ, không chứa dữ liệu nhạy cảm cấp dự án.
 * Lưu ý: Team trong schema chưa có parentId → sơ đồ phẳng theo team (không cần migration).
 */
export async function listOrgChart(): Promise<OrgChart> {
  await requireSession();
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    take: MAX_TEAMS,
    select: {
      id: true,
      name: true,
      description: true,
      members: {
        select: {
          role: true,
          user: { select: { id: true, name: true, email: true, avatar: true } }
        }
      }
    }
  });
  return buildOrgChart(teams);
}
