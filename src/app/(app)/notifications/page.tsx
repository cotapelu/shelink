/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { getNotifications, markAllNotificationsRead } from "@/server/notifications/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const typeLabels: Record<string, string> = {
  PRESERVATION_EXPIRY: "保全到期",
  HEARING_REMINDER: "庭审",
  DEADLINE_REMINDER: "期限",
  SEAL_STATUS_CHANGE: "用章",
  SMS_ARRIVAL: "短信",
  TASK_ASSIGNED: "系统",
  SYSTEM: "系统",
  ARCHIVE_APPROVED: "归档",
  ARCHIVE_REJECTED: "归档"
};

const priorityClass: Record<string, string> = {
  URGENT: "text-red-600",
  HIGH: "text-orange-600",
  NORMAL: "text-foreground",
  LOW: "text-muted-foreground"
};

export default async function NotificationsPage() {
  const notifications = await getNotifications({ limit: 100 });
  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllReadAction() {
    "use server";
    await markAllNotificationsRead();
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">通知</h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            系统提醒、用章、期限和庭审通知
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllReadAction}>
            <Button type="submit" variant="outline" size="sm" className="gap-1.5">
              <CheckCheck className="h-3.5 w-3.5" />
              全部已读
            </Button>
          </form>
        )}
      </div>

      <div className="ll-surface overflow-hidden rounded-lg">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-6 w-6 opacity-40" />
            暂无通知
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => {
              const row = (
                <div
                  className={cn(
                    "flex min-w-0 items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/60",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <span
                    className={cn(
                      "mt-1 h-2 w-2 shrink-0 rounded-full",
                      n.read ? "bg-muted" : "bg-primary"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {typeLabels[n.type] ?? n.type}
                      </span>
                      <span
                        className={cn(
                          "min-w-0 truncate text-[13px]",
                          !n.read && "font-medium",
                          priorityClass[n.priority] ?? "text-foreground"
                        )}
                      >
                        {n.title}
                      </span>
                    </div>
                    {n.content && (
                      <p className="mt-1 truncate text-[12px] text-muted-foreground">
                        {n.content}
                      </p>
                    )}
                  </div>
                  <time className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {formatTime(n.createdAt)}
                  </time>
                </div>
              );

              return n.href ? (
                <Link key={n.id} href={n.href} className="block">
                  {row}
                </Link>
              ) : (
                <div key={n.id}>{row}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}
