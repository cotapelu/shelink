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

import { useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { triggerDueReminderScan } from "@/server/reminders/actions";

export function ReminderScanButton() {
  const [isPending, startTransition] = useTransition();

  function handleScan() {
    startTransition(async () => {
      try {
        const r = await triggerDueReminderScan();
        const total = r.deadlineNotified + r.hearingNotified;
        toast.success(`扫描完成：新推送 ${total} 条`, {
          description: `期限 ${r.deadlineNotified}·开庭 ${r.hearingNotified}（去重跳过 ${r.suppressed}）`
        });
      } catch (err) {
        toast.error("扫描失败", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <Button size="sm" onClick={handleScan} disabled={isPending} className="shrink-0 gap-1.5">
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5" />
      )}
      立即扫描
    </Button>
  );
}
