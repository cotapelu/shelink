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
 * v0.21: Tổng hợp dữ liệu báo cáo tuần của luật sư (góc nhìn per-user)
 *
 * Định nghĩa tuần: Thứ Hai 00:00:00 → Thứ Hai tuần sau 00:00:00 (khoảng nửa mở)
 */
import { prisma } from "@/lib/prisma";
import type { ReportPeriod } from "./queries";

export function weekPeriod(now = new Date()): ReportPeriod {
  // Thứ Hai = 0
  const dow = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    label: `${fmt(monday)} ~ ${fmt(new Date(nextMonday.getTime() - 86400_000))}`,
    start: monday,
    end: nextMonday
  };
}

export type LawyerWeeklyDigest = {
  userId: string;
  userName: string;
  period: ReportPeriod;
  newIntake: number;
  closed: number;
  archived: number;
  receivedAmount: number;
};

/**
 * Tóm tắt tuần của một luật sư. Tái sử dụng một truy vấn, bên gọi lặp.
 */
export async function getLawyerWeeklyDigest(input: {
  userId: string;
  userName: string;
  period?: ReportPeriod;
}): Promise<LawyerWeeklyDigest> {
  const period = input.period ?? weekPeriod();

  const [newIntake, closed, archived, fees] = await Promise.all([
    prisma.matter.count({
      where: {
        ownerId: input.userId,
        createdAt: { gte: period.start, lt: period.end },
        deletedAt: null
      }
    }),
    prisma.matter.count({
      where: {
        ownerId: input.userId,
        closedAt: { gte: period.start, lt: period.end },
        deletedAt: null
      }
    }),
    prisma.matter.count({
      where: {
        ownerId: input.userId,
        archivedAt: { gte: period.start, lt: period.end },
        deletedAt: null
      }
    }),
    prisma.feeEntry.aggregate({
      where: {
        type: "RECEIVED",
        occurredAt: { gte: period.start, lt: period.end },
        matter: { ownerId: input.userId }
      },
      _sum: { amount: true }
    })
  ]);

  return {
    userId: input.userId,
    userName: input.userName,
    period,
    newIntake,
    closed,
    archived,
    receivedAmount: fees._sum.amount ? Number(fees._sum.amount) : 0
  };
}

export function formatWeeklyDigestContent(d: LawyerWeeklyDigest): string {
  const parts = [
    `Tiếp nhận mới ${d.newIntake} vụ`,
    `Đã kết thúc ${d.closed} vụ`,
    `Đã lưu trữ ${d.archived} vụ`,
    `Thu ${d.receivedAmount.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₫`
  ];
  return parts.join(" · ");
}
