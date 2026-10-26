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
 * v0.20: Tổng hợp dữ liệu báo cáo của văn phòng (chỉ đọc, không có use server)
 *
 * 4 loại chỉ tiêu (theo kế hoạch tiếp theo của PRD):
 * - Khối lượng vụ: mới tiếp nhận trong kỳ / đang làm / đã kết thúc / đã lưu trữ
 * - Phân bố theo loại: theo MatterCategory
 * - Sản lượng luật sư: số vụ phụ trách / số vụ đã kết thúc / số tiền đã thu của mỗi luật sư
 * - Công nợ khách: gộp theo khách (phải thu - đã thu)
 *
 * Khoảng thời gian: bên gọi truyền [start, end]; vụ nào Matter.createdAt rơi vào kỳ thì tính là “mới tiếp nhận”.
 */
import { prisma } from "@/lib/prisma";
import type { MatterCategory } from "@prisma/client";

export type ReportPeriod = {
  label: string;
  start: Date;
  end: Date;
};

export function periodPresets(now = new Date()): Record<"month" | "quarter" | "year" | "lastYear", ReportPeriod> {
  const y = now.getFullYear();
  const m = now.getMonth();
  const q = Math.floor(m / 3);
  return {
    month: {
      label: `Tháng ${m + 1}/${y}`,
      start: new Date(y, m, 1),
      end: new Date(y, m + 1, 1)
    },
    quarter: {
      label: `Q${q + 1}/${y}`,
      start: new Date(y, q * 3, 1),
      end: new Date(y, q * 3 + 3, 1)
    },
    year: {
      label: `Năm ${y}`,
      start: new Date(y, 0, 1),
      end: new Date(y + 1, 0, 1)
    },
    lastYear: {
      label: `Năm ${y - 1}`,
      start: new Date(y - 1, 0, 1),
      end: new Date(y, 0, 1)
    }
  };
}

/**
 * Giải thích khoảng thời gian tự chọn (gồm start, không gồm end, nửa khoảng mở).
 * - start/end phải là yyyy-MM-dd, nếu không thì báo lỗi
 * - end > start
 * - Độ rộng ≤ 5 năm (tránh nhập sai năm dẫn đến quét toàn bộ CSDL)
 */
export function customPeriod(startStr: string, endStr: string): ReportPeriod {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(startStr) || !re.test(endStr)) {
    throw new Error("Định dạng ngày không hợp lệ, cần yyyy-MM-dd");
  }
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  // end được hiểu là “gồm cả ngày”, đổi sang nửa khoảng mở cần +1 ngày
  const end = new Date(ey, em - 1, ed + 1);
  if (end.getTime() <= start.getTime()) {
    throw new Error("Ngày kết thúc phải sau ngày bắt đầu");
  }
  const days = (end.getTime() - start.getTime()) / 86400_000;
  if (days > 5 * 366) {
    throw new Error("Khoảng tự chọn không được quá 5 năm");
  }
  return {
    label: `${startStr} ~ ${endStr}`,
    start,
    end
  };
}

export type ReportKpis = {
  newIntake: number;
  inProgress: number;
  closed: number;
  archived: number;
  archiveRate: number; // đã lưu trữ / đã kết thúc; khi 0 thì trả về 0
};

export type CategoryBreakdown = {
  category: MatterCategory;
  count: number;
};

export type LawyerOutput = {
  userId: string;
  name: string;
  ownedCount: number; // số vụ có owner = userId
  closedCount: number;
  receivedAmount: number; // số tiền đã thu
};

export type ClientReceivable = {
  clientId: string;
  name: string;
  receivable: number;
  received: number;
  balance: number;
};

export type ReportData = {
  period: ReportPeriod;
  kpis: ReportKpis;
  byCategory: CategoryBreakdown[];
  byLawyer: LawyerOutput[];
  byClientReceivable: ClientReceivable[];
};

export async function getReportData(period: ReportPeriod): Promise<ReportData> {
  // KPI 1: mới tiếp nhận trong kỳ (createdAt rơi vào kỳ)
  const newIntake = await prisma.matter.count({
    where: {
      createdAt: { gte: period.start, lt: period.end },
      deletedAt: null
    }
  });

  // KPI 2: đang làm (status = IN_PROGRESS, không phân biệt tạo khi nào)
  const inProgress = await prisma.matter.count({
    where: { status: "IN_PROGRESS", deletedAt: null }
  });

  // KPI 3: đã kết thúc trong kỳ (closedAt rơi vào kỳ)
  const closed = await prisma.matter.count({
    where: {
      closedAt: { gte: period.start, lt: period.end },
      deletedAt: null
    }
  });

  // KPI 4: đã lưu trữ trong kỳ (archivedAt rơi vào kỳ)
  const archived = await prisma.matter.count({
    where: {
      archivedAt: { gte: period.start, lt: period.end },
      deletedAt: null
    }
  });

  const archiveRate = closed > 0 ? archived / closed : 0;

  // Phân bố theo loại (phân loại các vụ mới tiếp nhận trong kỳ)
  const cats = await prisma.matter.groupBy({
    by: ["category"],
    where: {
      createdAt: { gte: period.start, lt: period.end },
      deletedAt: null
    },
    _count: { _all: true }
  });
  const byCategory: CategoryBreakdown[] = cats.map((c) => ({
    category: c.category,
    count: c._count._all
  }));

  // Sản lượng luật sư (gộp theo owner: mới tiếp nhận trong kỳ + đã kết thúc trong kỳ + thu trong kỳ)
  const lawyerOwnedRaw = await prisma.matter.groupBy({
    by: ["ownerId"],
    where: {
      createdAt: { gte: period.start, lt: period.end },
      deletedAt: null
    },
    _count: { _all: true }
  });
  const lawyerClosedRaw = await prisma.matter.groupBy({
    by: ["ownerId"],
    where: {
      closedAt: { gte: period.start, lt: period.end },
      deletedAt: null
    },
    _count: { _all: true }
  });

  // Thu của luật sư trong kỳ: FeeEntry.type=RECEIVED + occurredAt trong kỳ + matter.ownerId
  const feeReceivedRaw = await prisma.feeEntry.findMany({
    where: {
      type: "RECEIVED",
      occurredAt: { gte: period.start, lt: period.end }
    },
    select: { amount: true, matter: { select: { ownerId: true } } }
  });
  const receivedByOwner = new Map<string, number>();
  for (const f of feeReceivedRaw) {
    const oid = f.matter?.ownerId;
    if (!oid) continue;
    receivedByOwner.set(oid, (receivedByOwner.get(oid) ?? 0) + Number(f.amount));
  }

  const userIds = new Set<string>();
  for (const r of lawyerOwnedRaw) userIds.add(r.ownerId);
  for (const r of lawyerClosedRaw) userIds.add(r.ownerId);
  for (const id of receivedByOwner.keys()) userIds.add(id);
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, name: true }
  });
  const userNameById = new Map(users.map((u) => [u.id, u.name]));
  const ownedByOwner = new Map(lawyerOwnedRaw.map((r) => [r.ownerId, r._count._all]));
  const closedByOwner = new Map(lawyerClosedRaw.map((r) => [r.ownerId, r._count._all]));

  const byLawyer: LawyerOutput[] = Array.from(userIds)
    .map((uid) => ({
      userId: uid,
      name: userNameById.get(uid) ?? uid,
      ownedCount: ownedByOwner.get(uid) ?? 0,
      closedCount: closedByOwner.get(uid) ?? 0,
      receivedAmount: receivedByOwner.get(uid) ?? 0
    }))
    .sort((a, b) => b.receivedAmount - a.receivedAmount || b.ownedCount - a.ownedCount);

  // Công nợ khách: gộp FeeEntry RECEIVABLE / RECEIVED theo matter.primaryClient
  const fees = await prisma.feeEntry.findMany({
    where: {
      type: { in: ["RECEIVABLE", "RECEIVED"] },
      occurredAt: { gte: period.start, lt: period.end }
    },
    select: {
      type: true,
      amount: true,
      matter: { select: { primaryClient: { select: { id: true, name: true } } } }
    }
  });
  const byClient = new Map<string, ClientReceivable>();
  for (const f of fees) {
    const c = f.matter?.primaryClient;
    if (!c) continue;
    if (!byClient.has(c.id)) {
      byClient.set(c.id, {
        clientId: c.id,
        name: c.name,
        receivable: 0,
        received: 0,
        balance: 0
      });
    }
    const row = byClient.get(c.id)!;
    if (f.type === "RECEIVABLE") row.receivable += Number(f.amount);
    if (f.type === "RECEIVED") row.received += Number(f.amount);
  }
  for (const row of byClient.values()) row.balance = row.receivable - row.received;
  const byClientReceivable = Array.from(byClient.values()).sort(
    (a, b) => b.balance - a.balance
  );

  return {
    period,
    kpis: { newIntake, inProgress, closed, archived, archiveRate },
    byCategory,
    byLawyer,
    byClientReceivable
  };
}
