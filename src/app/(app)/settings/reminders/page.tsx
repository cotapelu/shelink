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
/**
 * v0.38: 提醒维护 —— 手动触发"到期/开庭提醒"扫描。
 *
 * cron 只在生产 next start 跑，dev 模式不触发；此页给管理员一个立即扫描的入口，
 * 方便本地验证开庭/期限提醒是否正确生成。
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
        <h2 className="text-lg font-semibold">提醒维护</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          系统每天 09:00 自动扫描法定期限 / 开庭，对临近项推送站内通知（开庭提前 3 天 / 1 天 / 当天早上）。
          自动扫描仅在生产环境运行，本地开发不触发——可在此手动立即扫一遍用于验证。
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">立即扫描提醒</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              扫描 T-3 / T-1 / T 的开庭与到期项，对接收人补推通知（当日已推过的不重复）。
            </div>
          </div>
          <ReminderScanButton />
        </div>
      </div>
    </div>
  );
}
