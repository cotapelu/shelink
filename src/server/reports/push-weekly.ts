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

/**
 * v0.21: 推送本周报告给全员
 *
 * 两个入口：
 * - admin 手动：pushWeeklyReportToAll（require session）
 * - cron 自动（v0.22）：runWeeklyReportPush（无 auth，trigger=cron）
 *
 * 收件人：所有 active 的 ADMIN / PRINCIPAL_LAWYER / LAWYER。
 * 每人收到自己的 LawyerWeeklyDigest 摘要，作为 Notification（type=SYSTEM）。
 */
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { createNotification } from "@/server/notifications/create";
import {
  weekPeriod,
  getLawyerWeeklyDigest,
  formatWeeklyDigestContent
} from "./weekly";

export type WeeklyPushResult = {
  succeeded: number;
  failed: { userId: string; error: string }[];
  weekLabel: string;
};

/**
 * 核心逻辑，可被 server action 或 cron 调用。
 * triggerUserId: server action 传当前 admin id；cron 传 null。
 */
export async function runWeeklyReportPush(
  triggerUserId: string | null
): Promise<WeeklyPushResult> {
  const period = weekPeriod();
  const recipients = await prisma.user.findMany({
    where: {
      active: true,
      role: { in: ["ADMIN", "PRINCIPAL_LAWYER", "LAWYER"] }
    },
    select: { id: true, name: true }
  });

  const failed: { userId: string; error: string }[] = [];
  let succeeded = 0;
  for (const u of recipients) {
    try {
      const digest = await getLawyerWeeklyDigest({
        userId: u.id,
        userName: u.name,
        period
      });
      await createNotification({
        userId: u.id,
        type: "SYSTEM",
        priority: "NORMAL",
        title: `本周报告（${period.label}）`,
        content: formatWeeklyDigestContent(digest),
        href: "/reports?period=month",
        refType: "WeeklyReport",
        refId: period.label
      });
      succeeded++;
    } catch (err) {
      failed.push({
        userId: u.id,
        error: err instanceof Error ? err.message : "未知错误"
      });
    }
  }

  await audit({
    userId: triggerUserId,
    action: triggerUserId ? "WEEKLY_REPORT_PUSH" : "WEEKLY_REPORT_PUSH_CRON",
    targetType: "Report",
    targetId: period.label,
    detail: {
      weekLabel: period.label,
      total: recipients.length,
      succeeded,
      failed: failed.length,
      trigger: triggerUserId ? "manual" : "cron"
    }
  });

  return { succeeded, failed, weekLabel: period.label };
}

export async function pushWeeklyReportToAll(): Promise<WeeklyPushResult> {
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("仅管理员 / 主任律师可推送周报");
  }
  return runWeeklyReportPush(session.user.id);
}
