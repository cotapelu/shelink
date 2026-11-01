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
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Calendar, AlertTriangle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ConflictSearchButton } from "./conflict-search-button";
import type { ScheduleItem } from "@/server/dashboard/actions";

function getGreeting(hour: number) {
  if (hour < 6) return "Đêm khuya rồi";
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 13) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

const typeMeta = {
  deadline: { icon: AlertTriangle, color: "text-amber-600", label: "Thời hạn" },
  hearing: { icon: Calendar, color: "text-primary", label: "Phiên tòa" }
};

/** v0.47：Khu lời chào đầu trang + Lịch sắp tới bên phải */
export function DashboardGreeting({
  name,
  summary,
  scheduleItems
}: {
  name: string;
  summary: { todayDeadlineCount: number; weekHearingCount: number; nearTermCount: number };
  scheduleItems: ScheduleItem[];
}) {
  const router = useRouter();
  const today = new Date();
  const greeting = getGreeting(today.getHours());
  const dateLabel = today.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.7, 0.3, 1] }}
      className="grid grid-cols-1 gap-4 py-3 lg:grid-cols-5"
    >
      {/* Bên trái: lời chào + thống kê + nút */}
      <div className="flex flex-col gap-4 lg:col-span-3">
        <span className="text-xs text-muted-foreground">{dateLabel}</span>

        <div>
          <h1 className="text-[clamp(1.5rem,2.6vw,2.25rem)] font-medium leading-[1.1] tracking-tight">
            {greeting}
            {name && <span className="text-foreground/85">，{name}</span>}
            <span className="text-muted-foreground/50">。</span>
          </h1>
          <p className="mt-2 max-w-xl text-[0.875rem] leading-relaxed text-muted-foreground">
            Hôm nay có <Num>{summary.todayDeadlineCount}</Num> việc cần xử lý；phiên tòa tuần này{" "}
            <Num>{summary.weekHearingCount}</Num> phiên；thời hạn sắp tới <Num>{summary.nearTermCount}</Num> mục.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => router.push("/matters?tab=intake&new=1")}
            className="h-9 gap-1.5 px-4 shadow-sm"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Tạo tiếp nhận
          </Button>
          <ConflictSearchButton />
        </div>
      </div>

      {/* Bên phải: Lịch sắp tới */}
      <div className="ll-surface min-w-0 p-3 lg:col-span-2">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-[12px] font-medium text-foreground">Lịch sắp tới</h3>
          </div>
          <Link
            href="/schedule"
            className="inline-flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            Lịch
            <ArrowRight className="h-3 w-3" strokeWidth={1.8} />
          </Link>
        </div>

        {scheduleItems.length > 0 ? (
          <ul className="h-[150px] space-y-1 overflow-y-auto pr-1">
            {scheduleItems.map((item) => (
              <ScheduleBriefItem key={item.id} item={item} />
            ))}
          </ul>
        ) : (
          <div className="flex h-[150px] items-center justify-center text-[12px] text-muted-foreground">
            Chưa có sự kiện sắp tới
          </div>
        )}
      </div>
    </motion.section>
  );
}

function ScheduleBriefItem({ item }: { item: ScheduleItem }) {
  const meta = typeMeta[item.type];
  const Icon = meta.icon;
  const subject = item.clientName ?? item.matter;
  const content = (
    <div className="flex min-w-0 items-center gap-1.5">
      <Icon className={meta.color} style={{ width: 12, height: 12 }} strokeWidth={1.8} />
      <span className="shrink-0 rounded-sm bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">
        {meta.label}
      </span>
      <span className="shrink-0 rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tabular text-primary ring-1 ring-primary/15">
        {item.date} {item.time ?? "--:--"}
      </span>
      <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">
        {item.title}
        <span className="text-muted-foreground"> · {subject}</span>
      </span>
    </div>
  );
  const className = "block rounded-md px-1.5 py-1 transition-colors hover:bg-muted/70";

  return (
    <li>
      {item.matterId ? (
        <Link href={`/matters/${item.matterId}`} className={className}>
          {content}
        </Link>
      ) : (
        <div className={className}>{content}</div>
      )}
    </li>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-mono text-[1.15rem] font-medium tabular text-foreground"
      style={{ letterSpacing: "-0.02em" }}
    >
      {children}
    </span>
  );
}
