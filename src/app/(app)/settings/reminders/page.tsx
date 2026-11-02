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
 * v0.38: Bảo trì nhắc nhở —— kích hoạt thủ công quét "nhắc đến hạn/mở phiên".
 *
 * cron chỉ chạy ở next start production, chế độ dev không kích hoạt; trang này cho admin một cửa vào quét ngay,
 * thuận tiện kiểm tra trên máy nhắc phiên tòa/thời hạn có sinh đúng không.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ReminderScanButton } from "./_components/reminder-scan-button";

export default async function RemindersSettingsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  const isManager =
    session.user.role === "ADMIN" || session.user.role === "PRINCIPAL_LAWYER";
  if (!isManager) redirect("/settings/profile");

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold">Bảo trì nhắc nhở</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Hệ thống mỗi ngày 09:00 tự quét thời hạn / phiên tòa theo luật định, đẩy thông báo trong site cho mục sắp tới (phiên tòa trước 3 ngày / 1 ngày / sáng hôm đó).
          Quét tự động chỉ chạy ở production, dev local không kích hoạt —— có thể quét ngay một lượt ở đây để kiểm chứng.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Quét nhắc nhở ngay</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              Quét các mục mở phiên và đến hạn T-3 / T-1 / T, đẩy bù thông báo cho người nhận (đã đẩy trong ngày thì không lặp lại).
            </div>
          </div>
          <ReminderScanButton />
        </div>
      </div>
    </div>
  );
}
